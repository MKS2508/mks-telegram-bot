import type { BootstrapClient } from './client.js'
import { NewMessage } from 'telegram/events'

/**
 * Result of bot creation
 */
export interface BotCreationResult {
  success: boolean
  botToken?: string
  botUsername?: string
  error?: string
}

/**
 * Options for creating a bot
 */
export interface CreateBotOptions {
  botName: string
  botUsername: string
  description?: string
  about?: string
}

/**
 * Bot information from BotFather
 */
export interface BotInfo {
  username: string // @botname
  name: string // Display name
  token?: string // Bot token (if available)
  description?: string // Bot description
  about?: string // About text
  canJoinGroups?: boolean
  canReadAllGroupMessages?: boolean
  supportsInlineQueries?: boolean
}

/**
 * Result of listing bots
 */
export interface BotListResult {
  success: boolean
  bots?: BotInfo[]
  error?: string
}

/**
 * Result of getting bot info
 */
export interface BotInfoResult {
  success: boolean
  bot?: BotInfo
  error?: string
}

/**
 * Message type - any message from Telegram
 */
type Message = any

/**
 * BotFather interaction manager
 * Handles automated bot creation via @BotFather
 */
export class BotFatherManager {
  private botFatherUsername = 'botfather'
  private lastMessage: Message | null = null
  private messageHandlerRef: any = null
  private resolveResponse: ((message: Message) => void) | null = null
  private messageHandler: ((message: Message) => void) | null = null
  private messageBuffer: Message[] = []
  private isListening = false

  constructor(private client: BootstrapClient) {}

  /**
   * Create a new bot via @BotFather
   * @param options Bot creation options
   * @returns Bot creation result with token and username
   */
  async createBot(options: CreateBotOptions): Promise<BotCreationResult> {
    try {
      // Start listening for messages early
      this.setupMessageListener()
      await this.sleep(500)

      // 1. Send /newbot to BotFather
      await this.sendMessageToBotFather('/newbot')
      await this.sleep(1000)

      // 2. Wait for "Choose a name" prompt and send bot name
      const namePrompt = await this.waitForResponse(10000)
      if (!namePrompt) {
        this.removeMessageListener()
        return { success: false, error: 'No response from BotFather (timeout)' }
      }

      const namePromptText = this.extractMessageText(namePrompt)
      console.log(`[DEBUG] BotFather response: "${namePromptText}"`)

      if (!this.isBotNamePrompt(namePromptText)) {
        this.removeMessageListener()
        return { success: false, error: `Unexpected response: "${namePromptText}"` }
      }

      await this.sendMessageToBotFather(options.botName)
      await this.sleep(1000)

      // 3. Wait for "Choose a username" prompt and send username
      const usernamePrompt = await this.waitForResponse(10000)
      if (!usernamePrompt) {
        this.removeMessageListener()
        return { success: false, error: 'No response after bot name (timeout)' }
      }

      const usernamePromptText = this.extractMessageText(usernamePrompt)
      console.log(`[DEBUG] BotFather response: "${usernamePromptText}"`)

      if (!this.isUsernamePrompt(usernamePromptText)) {
        this.removeMessageListener()
        return { success: false, error: `Unexpected response: "${usernamePromptText}"` }
      }

      await this.sendMessageToBotFather(options.botUsername)
      await this.sleep(1000)

      // 4. Wait for token/confirmation
      const tokenMessage = await this.waitForResponse(15000)
      if (!tokenMessage) {
        this.removeMessageListener()
        return { success: false, error: 'No response after username (timeout)' }
      }

      const tokenText = this.extractMessageText(tokenMessage)
      console.log(`[DEBUG] BotFather response: "${tokenText}"`)
      const result = this.parseBotToken(tokenText)

      // Clean up
      this.removeMessageListener()

      return result
    } catch (error) {
      this.removeMessageListener()
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Extract text from message object
   * GramJS NewMessage event structure: event.message.message (for text content)
   */
  private extractMessageText(message: Message): string {
    try {
      // GramJS NewMessage events have nested structure:
      // event (what handler receives) -> .message (Message object) -> .message (text content)

      // @ts-ignore - accessing GramJS internal structure
      const msg = message.message

      // If msg exists and has .message property (text content)
      // @ts-ignore
      if (msg?.message) {
        // @ts-ignore
        return String(msg.message)
      }

      // Try direct .text property on the message object
      // @ts-ignore
      if (msg?.text) {
        // @ts-ignore - text might be an array (FormattedMessage)
        const text = msg.text
        if (Array.isArray(text)) {
          // FormattedMessage is an array with text property
          // @ts-ignore
          return text.map((t: any) => t.text || t).join('')
        }
        return String(text)
      }

      // Fallback: try direct message.text
      if ('text' in message && message.text) {
        const text = message.text
        if (Array.isArray(text)) {
          // @ts-ignore
          return text.map((t: any) => t.text || t).join('')
        }
        return String(text)
      }

      // DEBUG: Log structure if we can't extract
      console.log('[DEBUG] Message structure:', JSON.stringify(message).slice(0, 200))

      return ''
    } catch (error) {
      console.log('[DEBUG] Error extracting message text:', error)
      return ''
    }
  }

  /**
   * Check if message is asking for bot name
   */
  private isBotNamePrompt(text: string): boolean {
    const lower = text.toLowerCase()
    return (
      lower.includes('choose') ||
      lower.includes('name') ||
      lower.includes('title') ||
      lower.includes('Alright') ||
      (lower.includes('please') && lower.includes('name'))
    )
  }

  /**
   * Check if message is asking for username
   */
  private isUsernamePrompt(text: string): boolean {
    const lower = text.toLowerCase()
    return (
      (lower.includes('username') || lower.includes('user name')) &&
      (lower.includes('bot') || lower.includes('must end'))
    )
  }

  /**
   * Parse bot token from BotFather's message
   */
  private parseBotToken(text: string): BotCreationResult {
    // BotFather sends token in format: 123456:ABC-DEF1234...
    // Multiple regex patterns for robustness
    const tokenPatterns = [
      /(\d{7,10}:[A-Za-z0-9_-]{35})/, // Standard format
      /(\d{7,10}:[A-Za-z0-9_-]{32,})/, // Slightly shorter hash
      /(\d{6,10}:[A-Za-z0-9_-]{30,})/, // More flexible
    ]

    let token: string | undefined
    for (const pattern of tokenPatterns) {
      const match = text.match(pattern)
      if (match) {
        token = match[1]
        break
      }
    }

    if (!token) {
      // Check for error messages
      if (text.toLowerCase().includes('already taken')) {
        return { success: false, error: 'Username already taken' }
      }
      if (text.toLowerCase().includes('invalid')) {
        return { success: false, error: 'Invalid username format' }
      }
      return { success: false, error: `Could not parse bot token from: "${text.slice(0, 100)}"` }
    }

    // Try to extract username from the message
    // BotFather sends: "You will find it at t.me/username" or "@username"
    const usernamePatterns = [
      /t\.me\/([A-Za-z0-9_]{5,32}bot)/i,  // t.me/username format
      /@([A-Za-z0-9_]{5,32}bot)/i,         // @username format
      /username[^\w]*([A-Za-z0-9_]{5,32}bot)/i,  // "username: bot" format
    ]

    let username: string | undefined
    for (const pattern of usernamePatterns) {
      const match = text.match(pattern)
      if (match) {
        username = match[1]
        break
      }
    }

    return {
      success: true,
      botToken: token,
      botUsername: username,
    }
  }

  /**
   * Send a message to BotFather
   */
  private async sendMessageToBotFather(text: string): Promise<void> {
    await this.client.sendMessageToUser(this.botFatherUsername, text)
  }

  /**
   * Set up message listener for BotFather responses
   */
  private setupMessageListener(): void {
    if (this.isListening) {
      return // Already listening
    }

    const client = this.client.getClient()

    // Store the handler function reference
    this.messageHandler = (event: Message) => {
      console.log(`[DEBUG] Message received from BotFather`)
      // Always buffer messages
      this.messageBuffer.push(event)
      this.lastMessage = event

      // Resolve pending promise if waiting
      if (this.resolveResponse) {
        const resolve = this.resolveResponse
        this.resolveResponse = null
        resolve(event)
      }
    }

    // Create the event filter and store the complete handler reference
    const event = new NewMessage({
      fromUsers: [this.botFatherUsername],
    })
    this.messageHandlerRef = client.addEventHandler(this.messageHandler, event)
    this.isListening = true
    console.log(`[DEBUG] BotFather listener started`)
  }

  /**
   * Remove message listener
   */
  private removeMessageListener(): void {
    if (this.messageHandlerRef && this.messageHandler) {
      const client = this.client.getClient()
      // Remove with the exact same handler and filter
      const event = new NewMessage({
        fromUsers: [this.botFatherUsername],
      })
      client.removeEventHandler(this.messageHandler, event)
      this.messageHandlerRef = null
    }

    this.messageHandler = null
    this.lastMessage = null
    this.resolveResponse = null
    this.messageBuffer = []
    this.isListening = false
    console.log(`[DEBUG] BotFather listener stopped`)
  }

  /**
   * Wait for a response from BotFather with Promise
   * @param timeout Timeout in milliseconds
   * @returns Message or null if timeout
   */
  private waitForResponse(timeout: number): Promise<Message | null> {
    return new Promise((resolve) => {
      // Check buffer first for any pending messages
      if (this.messageBuffer.length > 0) {
        const message = this.messageBuffer.shift()!
        console.log(`[DEBUG] Returning buffered message`)
        resolve(message)
        return
      }

      // Set up the resolve function to be called by the message handler
      this.resolveResponse = resolve

      // Ensure listener is set up
      if (!this.messageHandlerRef) {
        this.setupMessageListener()
      }

      // Set timeout
      setTimeout(() => {
        if (this.resolveResponse === resolve) {
          this.resolveResponse = null
          console.log(`[DEBUG] Timeout waiting for BotFather response`)
          resolve(null)
        }
      }, timeout)
    })
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * List all bots created by the user via BotFather
   * @returns List of bots with their information
   */
  async listBots(): Promise<BotListResult> {
    try {
      // Start listening for messages
      this.setupMessageListener()
      await this.sleep(500)

      // Send /mybots command to BotFather
      await this.sendMessageToBotFather('/mybots')
      await this.sleep(2000)

      // Wait for response with bot list
      const response = await this.waitForResponse(15000)
      if (!response) {
        this.removeMessageListener()
        return { success: false, error: 'No response from BotFather (timeout)' }
      }

      const responseText = this.extractMessageText(response)
      console.log(`[DEBUG] BotFather /mybots response: "${responseText}"`)

      // Parse the bot list from response
      const bots = this.parseBotList(responseText)

      // Clean up
      this.removeMessageListener()

      return { success: true, bots }
    } catch (error) {
      this.removeMessageListener()
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get detailed info about a specific bot
   * @param botUsername Bot username (with or without @)
   */
  async getBotInfo(botUsername: string): Promise<BotInfoResult> {
    try {
      // Clean username
      const username = botUsername.startsWith('@') ? botUsername.slice(1) : botUsername

      // Start listening for messages
      this.setupMessageListener()
      await this.sleep(500)

      // Send /mybots command first
      await this.sendMessageToBotFather('/mybots')
      await this.sleep(2000)

      // Try to get specific bot info
      // Note: BotFather doesn't have a direct command for this, so we parse from the list
      const response = await this.waitForResponse(15000)
      if (!response) {
        this.removeMessageListener()
        return { success: false, error: 'No response from BotFather (timeout)' }
      }

      const responseText = this.extractMessageText(response)
      const allBots = this.parseBotList(responseText)

      // Find the requested bot
      const bot = allBots.find((b) => b.username === username)

      this.removeMessageListener()

      if (!bot) {
        return { success: false, error: `Bot @${username} not found` }
      }

      return { success: true, bot }
    } catch (error) {
      this.removeMessageListener()
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Check if a bot username is available
   * @param botUsername Desired username
   */
  async checkUsernameAvailable(botUsername: string): Promise<boolean> {
    try {
      const username = botUsername.startsWith('@') ? botUsername.slice(1) : botUsername

      // Start listening for messages
      this.setupMessageListener()
      await this.sleep(500)

      // Try to create a bot with this username (will fail if taken)
      await this.sendMessageToBotFather('/newbot')
      await this.sleep(1000)

      // Wait for name prompt
      const namePrompt = await this.waitForResponse(10000)
      if (!namePrompt) {
        this.removeMessageListener()
        return false
      }

      // Send a dummy name
      await this.sendMessageToBotFather('Test')
      await this.sleep(1000)

      // Wait for username prompt
      const usernamePrompt = await this.waitForResponse(10000)
      if (!usernamePrompt) {
        this.removeMessageListener()
        return false
      }

      // Send the username to check
      await this.sendMessageToBotFather(username)
      await this.sleep(2000)

      // Check response
      const response = await this.waitForResponse(10000)
      if (!response) {
        this.removeMessageListener()
        return false
      }

      const responseText = this.extractMessageText(response)

      // Clean up - cancel the bot creation
      await this.sendMessageToBotFather('/cancel')
      this.removeMessageListener()

      // If username is taken, BotFather will say something like "is already taken"
      if (responseText.toLowerCase().includes('already taken') || responseText.toLowerCase().includes('occupied')) {
        return false
      }

      return true
    } catch (error) {
      this.removeMessageListener()
      return false
    }
  }

  /**
   * Parse bot list from BotFather response
   * @param responseText The text response from BotFather
   * @returns Array of bot information
   */
  private parseBotList(responseText: string): BotInfo[] {
    const bots: BotInfo[] = []

    // BotFather sends bot list in format:
    // "BotName (@usernamebot) - Description"
    // or numbered list:
    // "1. BotName (@usernamebot)"
    const patterns = [
      // Match: "BotName (@usernamebot)" or "1. BotName (@usernamebot)"
      /(?:\d+\.\s*)?(\S+)\s+\(([A-Za-z0-9_]+bot)\)/g,
      // Match: "@usernamebot - BotName"
      /@([A-Za-z0-9_]+bot)\s*-\s*([^\n]+)/g,
    ]

    for (const pattern of patterns) {
      let match
      // biome-ignore lint/suspicious/noAssignInExpressions: Required for regex exec loop
      while ((match = pattern.exec(responseText)) !== null) {
        if (pattern === patterns[0]) {
          // First pattern: name then username
          const name = match[1]?.trim()
          const username = match[2]?.trim()
          if (name && username) {
            bots.push({ username, name })
          }
        } else {
          // Second pattern: username then name
          const username = match[1]?.trim()
          const name = match[2]?.trim()
          if (username && name) {
            bots.push({ username, name })
          }
        }
      }
    }

    // Remove duplicates
    const seen = new Set<string>()
    return bots.filter((bot) => {
      if (seen.has(bot.username)) {
        return false
      }
      seen.add(bot.username)
      return true
    })
  }
}
