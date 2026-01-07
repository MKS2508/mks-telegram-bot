import type { BootstrapClient } from './client.js'
import { NewMessage } from 'telegram/events'
import { EditedMessage } from 'telegram/events/EditedMessage'

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
      console.log(`[DEBUG] Message event received from BotFather`)
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

    // Listener for NEW messages from BotFather
    const newMessageEvent = new NewMessage({
      fromUsers: [this.botFatherUsername],
    })
    client.addEventHandler(this.messageHandler, newMessageEvent)

    // Listener for EDITED messages from BotFather (pagination updates)
    const editedMessageEvent = new EditedMessage({
      fromUsers: [this.botFatherUsername],
    })
    client.addEventHandler(this.messageHandler, editedMessageEvent)

    this.messageHandlerRef = true // Mark as configured
    this.isListening = true
    console.log(`[DEBUG] BotFather listener started (NewMessage + EditedMessage)`)
  }

  /**
   * Remove message listener
   */
  private removeMessageListener(): void {
    if (this.messageHandlerRef && this.messageHandler) {
      const client = this.client.getClient()

      // Remove both listeners (NewMessage and EditedMessage)
      const newMessageEvent = new NewMessage({
        fromUsers: [this.botFatherUsername],
      })
      const editedMessageEvent = new EditedMessage({
        fromUsers: [this.botFatherUsername],
      })

      client.removeEventHandler(this.messageHandler, newMessageEvent)
      client.removeEventHandler(this.messageHandler, editedMessageEvent)

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
   * Clear message buffer (used after clicking pagination buttons)
   */
  private clearMessageBuffer(): void {
    this.messageBuffer = []
    this.resolveResponse = null
    console.log('[DEBUG] Message buffer cleared')
  }

  /**
   * Wait for a response from BotFather with Promise
   * @param timeout Timeout in milliseconds
   * @returns Message or null if timeout
   */
  private waitForResponse(timeout: number): Promise<Message | null> {
    return this.waitForNewResponse(timeout, null)
  }

  /**
   * Wait for a NEW response from BotFather (ignoring messages with same ID)
   * @param timeout Timeout in milliseconds
   * @param lastMessageId ID of last message to ignore
   * @returns Message or null if timeout
   */
  private waitForNewResponse(timeout: number, lastMessageId: number | null): Promise<Message | null> {
    return new Promise((resolve) => {
      // Check buffer first for any pending messages
      if (this.messageBuffer.length > 0) {
        // Find first message with different ID
        let message: Message | null = null
        while (this.messageBuffer.length > 0) {
          const msg = this.messageBuffer.shift()!
          // @ts-ignore
          const msgId = msg.message?.id

          // If we have a lastMessageId, skip messages with same or older ID
          if (lastMessageId && msgId && msgId <= lastMessageId) {
            console.log(`[DEBUG] Skipping old message ID: ${msgId}`)
            continue
          }

          message = msg
          break
        }

        if (message) {
          console.log(`[DEBUG] Returning buffered message`)
          resolve(message)
          return
        }
      }

      // Set up the resolve function to be called by the message handler
      this.resolveResponse = (msg: Message) => {
        // @ts-ignore
        const msgId = msg.message?.id

        // If we have a lastMessageId, ignore messages with same or older ID
        if (lastMessageId && msgId && msgId <= lastMessageId) {
          console.log(`[DEBUG] Ignoring old message ID: ${msgId}`)
          // Don't resolve, wait for next message
          return
        }

        resolve(msg)
      }

      // Ensure listener is set up
      if (!this.messageHandlerRef) {
        this.setupMessageListener()
      }

      // Set timeout
      setTimeout(() => {
        if (this.resolveResponse) {
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

      // Try parsing from inline keyboard buttons first (when response is "Choose a bot from the list below:")
      let bots = this.parseBotsFromInlineKeyboard(response)

      // If no bots found in buttons, try parsing from text
      if (bots.length === 0) {
        bots = this.parseBotList(responseText)
      }

      console.log(`[DEBUG] Found ${bots.length} bots`)

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
   * Parse bot list from inline keyboard buttons (when BotFather sends interactive buttons)
   * @param message Message object from BotFather
   * @returns Array of bot info
   */
  private parseBotsFromInlineKeyboard(message: Message): BotInfo[] {
    const bots: BotInfo[] = []

    try {
      // @ts-ignore - accessing GramJS internal structure
      const msg = message.message

      // @ts-ignore - replyMarkup contains inline keyboard
      if (!msg?.replyMarkup?.rows) {
        return bots
      }

      // @ts-ignore
      const rows = msg.replyMarkup.rows

      console.log(`[DEBUG] Found ${rows.length} button rows`)

      // Extract buttons from each row
      for (const row of rows) {
        // @ts-ignore
        if (!row.buttons) continue

        // @ts-ignore
        for (const button of row.buttons) {
          // @ts-ignore - button.text contains the bot display text
          const buttonText = button.text

          // Debug: Print ALL buttons to see pagination buttons
          console.log(`[DEBUG] Button found: "${buttonText}"`)

          // BotFather button format is usually: "BotName (@usernamebot)" or "@usernamebot"
          // Parse username from button text
          const usernameMatch = buttonText.match(/\(([A-Za-z0-9_]+bot)\)/) || buttonText.match(/@([A-Za-z0-9_]+bot)/)

          if (usernameMatch) {
            const username = usernameMatch[1]
            // Extract name (text before @ or parentheses)
            const name = buttonText
              .replace(/\s*\([A-Za-z0-9_]+bot\)/, '')
              .replace(/@[A-Za-z0-9_]+bot/, '')
              .trim()

            bots.push({ username, name: name || username })
            console.log(`[DEBUG] Extracted bot from button: ${username} - ${name}`)
          } else if (buttonText.endsWith('bot')) {
            // Fallback: if button text is just username
            bots.push({ username: buttonText, name: buttonText })
            console.log(`[DEBUG] Extracted bot from button (fallback): ${buttonText}`)
          }
        }
      }
    } catch (error) {
      console.log('[DEBUG] Error parsing inline keyboard:', error)
    }

    return bots
  }

  /**
   * Check if message has a pagination button with specific text
   */
  private hasPaginationButton(message: Message, buttonText: string): boolean {
    return this.findPaginationButtonData(message, buttonText) !== null
  }

  /**
   * Find pagination button data by text (supports multiple patterns)
   */
  private findPaginationButtonData(message: Message, buttonText: string): string | null {
    try {
      // @ts-ignore
      const msg = message.message
      if (!msg?.replyMarkup?.rows) return null

      // Common pagination patterns to search for
      const paginationPatterns = [
        buttonText, // "Next"
        '▶',
        '→',
        '›',
        '»',
        'Next page',
        'Page',
        '››',
      ]

      for (const row of msg.replyMarkup.rows) {
        // @ts-ignore
        if (!row.buttons) continue

        // @ts-ignore
        for (const button of row.buttons) {
          // @ts-ignore
          const buttonLabel = button.text

          // Check if button matches any pagination pattern
          for (const pattern of paginationPatterns) {
            if (buttonLabel === pattern || buttonLabel.includes(pattern)) {
              console.log(`[DEBUG] Found pagination button: "${buttonLabel}"`)
              // @ts-ignore - return the button data for clicking
              return button.data
            }
          }
        }
      }

      console.log(`[DEBUG] No pagination button found (looked for: ${paginationPatterns.join(', ')})`)
    } catch (error) {
      console.log('[DEBUG] Error finding pagination button:', error)
    }
    return null
  }

  /**
   * Click on an inline keyboard button
   */
  private async clickInlineButton(message: Message, buttonData: string): Promise<boolean> {
    try {
      // @ts-ignore
      const msg = message.message
      if (!msg?.id) {
        console.log('[DEBUG] No message ID for clicking button')
        return false
      }

      // Get raw Telegram client from BootstrapClient wrapper
      const tgClient = this.client.getClient()

      // Get BotFather peer
      const botFatherPeer = await tgClient.getEntity(this.botFatherUsername)

      // Convert button data to Buffer (required by Telegram API)
      const dataBuffer = Buffer.from(buttonData, 'utf-8')

      // Import Telegram TL API
      const { Api } = await import('telegram/tl/index.js')

      // Click button using getBotCallbackAnswer
      // @ts-ignore
      const result = await tgClient.invoke(new Api.messages.GetBotCallbackAnswer({
        peer: botFatherPeer,
        msgId: msg.id,
        data: dataBuffer,
      }))

      console.log(`[DEBUG] Clicked button with data: ${buttonData.slice(0, 20)}...`)
      return true
    } catch (error) {
      console.log('[DEBUG] Error clicking button:', error)
      return false
    }
  }

  /**
   * List ALL bots with pagination support
   */
  async listAllBots(): Promise<BotListResult> {
    try {
      this.setupMessageListener()

      const allBots: BotInfo[] = []
      let currentPage = 1
      let hasNextPage = true
      let lastMessageId: number | null = null

      while (hasNextPage) {
        // Send /mybots if first page
        if (currentPage === 1) {
          await this.sendMessageToBotFather('/mybots')
          await this.sleep(2000)
        } else {
          // For subsequent pages, wait a bit for BotFather to process
          await this.sleep(1000)
        }

        // Get current page response (ignore old messages for pagination)
        const timeout = currentPage === 1 ? 10000 : 10000
        const response = await this.waitForNewResponse(timeout, lastMessageId)
        if (!response) {
          console.log(`[DEBUG] No response for page ${currentPage} (timeout: ${timeout}ms)`)
          break
        }

        // @ts-ignore
        lastMessageId = response.message?.id || null
        console.log(`[DEBUG] Received message ID: ${lastMessageId}`)

        // Extract bots from this page
        const pageBots = this.parseBotsFromInlineKeyboard(response)

        // Deduplicate within this page
        const seen = new Set<string>()
        const uniquePageBots = pageBots.filter((bot) => {
          if (seen.has(bot.username)) return false
          seen.add(bot.username)
          return true
        })

        allBots.push(...uniquePageBots)
        console.log(`[DEBUG] Page ${currentPage}: Found ${uniquePageBots.length} bots (total: ${allBots.length})`)

        // Look for "Next" button
        const nextButtonData = this.findPaginationButtonData(response, 'Next')

        if (nextButtonData) {
          // Click "Next" button
          console.log('[DEBUG] Clicking Next button...')
          const clicked = await this.clickInlineButton(response, nextButtonData)
          if (!clicked) {
            console.log('[DEBUG] Failed to click Next button')
            break
          }

          currentPage++
        } else {
          // No Next button - we're done
          console.log('[DEBUG] No Next button found, reached last page')
          hasNextPage = false
        }

        // Safety limit to prevent infinite loops
        if (currentPage > 50) {
          console.log('[DEBUG] Reached page limit (50)')
          break
        }
      }

      this.removeMessageListener()

      // Remove duplicates across all pages
      const globalSeen = new Set<string>()
      const uniqueBots = allBots.filter((bot) => {
        if (globalSeen.has(bot.username)) return false
        globalSeen.add(bot.username)
        return true
      })

      console.log(`[DEBUG] Total unique bots across all pages: ${uniqueBots.length}`)

      return { success: true, bots: uniqueBots }
    } catch (error) {
      this.removeMessageListener()
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get bot token by clicking on bot button
   */
  async getBotToken(botUsername: string): Promise<{ success: boolean; token?: string }> {
    try {
      this.setupMessageListener()
      await this.sleep(500)

      // Send /mybots
      await this.sendMessageToBotFather('/mybots')
      await this.sleep(2000)

      // Wait for list response
      const listResponse = await this.waitForResponse(10000)
      if (!listResponse) {
        this.removeMessageListener()
        return { success: false }
      }

      // Find and click the bot button
      const buttonData = this.findBotButtonData(listResponse, botUsername)
      if (!buttonData) {
        console.log(`[DEBUG] Bot button not found for @${botUsername}`)
        this.removeMessageListener()
        return { success: false }
      }

      // Click bot button
      console.log(`[DEBUG] Clicking bot button for @${botUsername}...`)
      const clicked = await this.clickInlineButton(listResponse, buttonData)
      if (!clicked) {
        this.removeMessageListener()
        return { success: false }
      }

      await this.sleep(2000)

      // Wait for token response
      const tokenResponse = await this.waitForResponse(10000)
      if (!tokenResponse) {
        this.removeMessageListener()
        return { success: false }
      }

      const responseText = this.extractMessageText(tokenResponse)
      console.log(`[DEBUG] Token response for @${botUsername}: "${responseText.slice(0, 100)}..."`)

      // Parse token from response
      const tokenMatch = responseText.match(/(\d+:[A-Za-z0-9_-]{35,})/)
      if (tokenMatch) {
        this.removeMessageListener()
        return { success: true, token: tokenMatch[1] }
      }

      this.removeMessageListener()
      return { success: false }
    } catch (error) {
      this.removeMessageListener()
      console.log('[DEBUG] Error getting bot token:', error)
      return { success: false }
    }
  }

  /**
   * Find bot button data by username
   */
  private findBotButtonData(message: Message, botUsername: string): string | null {
    const cleanUsername = botUsername.startsWith('@') ? botUsername.slice(1) : botUsername

    try {
      // @ts-ignore
      const msg = message.message
      if (!msg?.replyMarkup?.rows) return null

      for (const row of msg.replyMarkup.rows) {
        // @ts-ignore
        if (!row.buttons) continue

        // @ts-ignore
        for (const button of row.buttons) {
          // @ts-ignore
          const buttonText = button.text

          // Check if button contains this bot's username
          if (buttonText.includes(cleanUsername) || buttonText.includes(`@${cleanUsername}`)) {
            // @ts-ignore
            console.log(`[DEBUG] Found bot button: ${buttonText}`)
            // @ts-ignore
            return button.data
          }
        }
      }
    } catch (error) {
      console.log('[DEBUG] Error finding bot button:', error)
    }
    return null
  }

  /**
   * Get all bots with their tokens
   */
  async getAllBotsWithTokens(): Promise<Array<BotInfo & { token: string }>> {
    const botsWithTokens: Array<BotInfo & { token: string }> = []

    try {
      // First get all bots (with pagination)
      const listResult = await this.listAllBots()
      if (!listResult.success || !listResult.bots) {
        return []
      }

      console.log(`[DEBUG] Fetching tokens for ${listResult.bots.length} bots...`)

      // For each bot, click to get the token
      for (let i = 0; i < listResult.bots.length; i++) {
        const bot = listResult.bots[i]
        if (!bot) continue

        console.log(`[DEBUG] [${i + 1}/${listResult.bots.length}] Fetching token for @${bot.username}...`)

        const tokenResult = await this.getBotToken(bot.username)
        if (tokenResult.success && tokenResult.token) {
          botsWithTokens.push({
            username: bot.username,
            name: bot.name || bot.username,
            token: tokenResult.token,
            description: bot.description,
            about: bot.about,
          })
          console.log(`[DEBUG] ✓ Got token for @${bot.username}`)
        } else {
          console.log(`[DEBUG] ✗ Failed to get token for @${bot.username}`)
        }

        // Small delay between requests to avoid rate limiting
        if (i < listResult.bots.length - 1) {
          await this.sleep(1000)
        }
      }

      console.log(`[DEBUG] Successfully fetched ${botsWithTokens.length}/${listResult.bots.length} bot tokens`)
    } catch (error) {
      console.log('[DEBUG] Error in getAllBotsWithTokens:', error)
    }

    return botsWithTokens
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
