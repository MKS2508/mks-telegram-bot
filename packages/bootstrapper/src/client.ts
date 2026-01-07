import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { NewMessage } from 'telegram/events'
import { input } from '@inquirer/prompts'
import bigInt, { type BigInteger } from 'big-integer'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Configuration for the Telegram client
 */
export interface TelegramClientConfig {
  apiId: number
  apiHash: string
  sessionPath?: string
}

/**
 * Session data for persistence
 */
export interface SessionData {
  apiId: number
  apiHash: string
  sessionString: string
}

/**
 * Bootstrap client for Telegram operations
 * Handles login, session management, and provides high-level methods
 */
export class BootstrapClient {
  private client: TelegramClient
  private sessionPath: string
  private isConnected = false

  constructor(config: TelegramClientConfig) {
    const sessionPath = config.sessionPath || this.getDefaultSessionPath()
    this.sessionPath = sessionPath

    // Load existing session or create new one
    let sessionString = ''
    if (fs.existsSync(sessionPath)) {
      sessionString = fs.readFileSync(sessionPath, 'utf-8')
    }

    const session = new StringSession(sessionString)
    this.client = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 5,
    })
  }

  /**
   * Connect to Telegram
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return
    }

    // @ts-ignore - connect method exists but type definition is incomplete
    await this.client.connect()

    this.isConnected = true
  }

  /**
   * Disconnect from Telegram
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return
    }

    await this.client.disconnect()
    this.isConnected = false
  }

  /**
   * Ensure user is authorized
   * Prompts for phone number and code if needed
   */
  async ensureAuthorized(): Promise<boolean> {
    await this.connect()

    const isAuthorized = await this.client.checkAuthorization()
    if (isAuthorized) {
      return true
    }

    // Need to authorize
    console.log('\n🔐 Telegram Authorization Required')
    console.log('This is a one-time process. Your session will be saved for future use.\n')

    console.log('📝 STEP 1: Phone Number')
    console.log('Enter your phone number with country code.')
    console.log('Example: +34612345678 (Spain) or +12025551234 (USA)\n')

    // Get phone number
    const phoneNumber = await input({
      message: 'Enter your phone number:',
      validate: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Phone number is required'
        }
        if (!value.startsWith('+')) {
          return 'Phone number must start with + (country code)'
        }
        return true
      },
    })

    try {
      console.log('\n⏳ Sending verification code...')
      console.log('Check your Telegram app for the code.\n')

      // Send code
      await this.client.sendCode(
        { apiId: this.client.apiId, apiHash: this.client.apiHash },
        phoneNumber
      )

      console.log('📝 STEP 2: Verification Code')
      console.log('Enter the code you received in Telegram.')
      console.log('The code is 5-7 digits long.\n')

      // Get code from user
      const code = await input({
        message: 'Enter the code:',
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return 'Code is required'
          }
          if (!/^\d{5,7}$/.test(value.trim())) {
            return 'Code must be 5-7 digits'
          }
          return true
        },
      })

      console.log('\n⏳ Verifying code...')

      // Sign in with the code
      // @ts-ignore - signIn method exists but types might be incorrect
      await (this.client as any).signIn(phoneNumber, { code: code.trim() })

      console.log('✅ Code verified!')

      // Check for 2FA
      const hasPassword = await (this.client as any).checkPassword(phoneNumber)
      if (hasPassword) {
        console.log('\n📝 STEP 3: Two-Factor Authentication (2FA)')
        console.log('You have Cloud Password enabled.')
        console.log('Enter your password to continue.\n')

        const password = await input({
          message: 'Enter your 2FA password:',
          validate: (value: string) => {
            if (!value || value.trim().length === 0) {
              return 'Password is required'
            }
            return true
          },
        })

        console.log('\n⏳ Verifying password...')
        await (this.client as any).signInWithPassword(phoneNumber, { password: password.trim() })
        console.log('✅ Password verified!')
      }

      // Save session
      console.log('\n💾 Saving session...')
      this.saveSession()

      console.log('\n✅ Successfully authorized!')
      console.log(`Your session has been saved to: ${this.sessionPath}`)
      console.log('Next time you won\'t need to login again.\n')

      return true
    } catch (error) {
      console.error('\n❌ Authorization failed')
      if (error instanceof Error) {
        console.error(`   Error: ${error.message}`)
      }
      console.log('')
      return false
    }
  }

  /**
   * Get the underlying TelegramClient
   */
  getClient(): TelegramClient {
    return this.client
  }

  /**
   * Get current user info
   */
  async getMe(): Promise<{ id: number; username?: string; firstName: string } | null> {
    try {
      const result = await this.client.getMe()

      // Extract ID from BigInteger or number
      let id: number
      if (typeof result.id === 'bigint') {
        id = Number(result.id)
      } else {
        id = Number(result.id)
      }

      return {
        id,
        username: result.username ?? undefined,
        firstName: result.firstName?.toString() ?? '',
      }
    } catch {
      return null
    }
  }

  /**
   * Save session to file
   */
  private saveSession(): void {
    const session = this.client.session as StringSession
    const sessionString = session.save()

    // Ensure directory exists
    const dir = path.dirname(this.sessionPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(this.sessionPath, sessionString, 'utf-8')
  }

  /**
   * Get default session path
   */
  private getDefaultSessionPath(): string {
    const homeDir = os.homedir()
    return path.join(homeDir, '.mks-telegram-bot', 'session.txt')
  }

  /**
   * Send a message to a user or chat
   */
  async sendMessageToUser(username: string, message: string): Promise<void> {
    const entity = await this.client.getEntity(username)
    await this.client.sendMessage(entity, { message })
  }

  /**
   * Get all dialogs (chats)
   */
  async getDialogs(): Promise<Array<{ id: number; name: string; username?: string }>> {
    const dialogs: Array<{ id: number; name: string; username?: string }> = []

    try {
      const result = await this.client.getDialogs({ limit: 100 })

      for (const dialog of result) {
        const entity = dialog.entity

        if (!entity) continue

        // Extract ID from BigInteger/number/bigint
        let id: number
        if (typeof entity.id === 'bigint') {
          id = Number(entity.id)
        } else if (typeof entity.id === 'number') {
          id = entity.id
        } else {
          continue
        }

        // Type guards for different entity types
        // @ts-ignore - className property exists at runtime
        if ('firstName' in entity && entity.className === 'User') {
          const user = entity as any
          dialogs.push({
            id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
            username: user.username ?? undefined,
          })
        }
        // @ts-ignore
        else if ('title' in entity) {
          const chat = entity as any
          dialogs.push({
            id,
            name: chat.title || 'Unknown',
          })
        }
      }
    } catch (error) {
      console.error('Error getting dialogs:', error)
    }

    return dialogs
  }

  /**
   * Get entity by username or ID
   */
  async getEntity(identifier: string | number): Promise<any> {
    return await this.client.getEntity(identifier)
  }

  /**
   * Create a new channel/supergroup
   */
  async createChannel(title: string, about: string = '', megagroup: boolean = false): Promise<{
    chatId?: number
    title?: string
  }> {
    try {
      const { Api } = await import('telegram/tl/index.js')
      // @ts-ignore - createChannel exists on Api.Channels
      const result = await this.client.invoke(new Api.Channels.CreateChannel({
        title,
        about,
        megagroup,
      }))

      // Extract chat ID
      let chatId: number | undefined
      // @ts-ignore - result structure varies
      if (result?.chatId) {
        // @ts-ignore
        const rawId = result.chatId
        chatId = typeof rawId === 'bigint' ? Number(rawId) : Number(rawId)
      }

      return { chatId, title }
    } catch (error) {
      console.error('Error creating channel:', error)
      return {}
    }
  }

  /**
   * Edit admin rights in a channel
   */
  async editAdminRights(
    channelId: number,
    userId: any,
    rights: {
      manageTopics?: boolean
      deleteMessages?: boolean
      editMessages?: boolean
      inviteUsers?: boolean
      banUsers?: boolean
      pinMessages?: boolean
      addAdmins?: boolean
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { Api } = await import('telegram/tl/index.js')

      const inputPeerChannel = {
        _: 'inputPeerChannel',
        channelId: Math.abs(channelId),
        accessHash: 0n, // Note: This might need to be fetched
      }

      // @ts-ignore - editAdmin exists
      await this.client.invoke(new Api.Channels.EditAdmin({
        channel: inputPeerChannel,
        userId,
        adminRights: new Api.ChatAdminRights({
          anonymous: false,
          manageTopics: rights.manageTopics ?? false,
          deleteMessages: rights.deleteMessages ?? false,
          editMessages: rights.editMessages ?? false,
          inviteUsers: rights.inviteUsers ?? false,
          banUsers: rights.banUsers ?? false,
          pinMessages: rights.pinMessages ?? false,
          addAdmins: rights.addAdmins ?? false,
        }),
        rank: 'Bot',
      }))

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Export invite link for a channel
   */
  async exportInviteLink(channelId: number): Promise<{ success: boolean; link?: string; error?: string }> {
    try {
      const { Api } = await import('telegram/tl/index.js')

      const inputPeerChannel = {
        _: 'inputPeerChannel',
        channelId: Math.abs(channelId),
        accessHash: 0n,
      }

      // @ts-ignore - exportInvite exists
      const result = await this.client.invoke(new Api.Channels.ExportInvite({
        channel: inputPeerChannel,
      }))

      return {
        success: true,
        // @ts-ignore - link property exists
        link: result?.link ?? undefined,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
