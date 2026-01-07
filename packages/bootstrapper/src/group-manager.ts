import type { BootstrapClient } from './client.js'
import bigInt, { type BigInteger } from 'big-integer'

/**
 * Helper to convert number/bigint to BigInteger for GramJS
 */
function toBigInteger(value: number | bigint): BigInteger {
  return bigInt(value.toString())
}

/**
 * Result of group creation
 */
export interface GroupCreationResult {
  success: boolean
  chatId?: number
  title?: string
  inviteLink?: string
  error?: string
}

/**
 * Options for creating a supergroup
 */
export interface CreateSupergroupOptions {
  title: string
  description?: string
  forumMode?: boolean
}

/**
 * Admin permissions for bot
 */
export interface BotAdminPermissions {
  canManageTopics?: boolean
  canDeleteMessages?: boolean
  canEditMessages?: boolean
  canInviteUsers?: boolean
  canBanUsers?: boolean
  canPinMessages?: boolean
}

/**
 * Group manager for creating and managing Telegram groups
 */
export class GroupManager {
  constructor(private client: BootstrapClient) {}

  /**
   * Create a new supergroup (megagroup/forum)
   * @param options Supergroup creation options
   * @returns Group creation result
   */
  async createSupergroup(options: CreateSupergroupOptions): Promise<GroupCreationResult> {
    const tgClient = this.client.getClient()

    try {
      const { Api } = await import('telegram/tl/index.js')

      // DEBUG: Log what we got
      console.log('[DEBUG] Api object keys:', Object.keys(Api || {}))
      console.log('[DEBUG] Api.channels:', Api.channels)

      // Create channel with forum mode
      // @ts-ignore - CreateChannel exists but type might be different
      const result = await tgClient.invoke(new Api.channels.CreateChannel({
        title: options.title,
        about: options.description || '',
        megagroup: true,
        forum: options.forumMode ?? true,
      }))

      // Extract chat ID from result - handle BigInteger
      let chatId: number | undefined
      // @ts-ignore - result structure varies
      if (result?.chatId) {
        // @ts-ignore
        const rawId = result.chatId
        chatId = typeof rawId === 'bigint' ? Number(rawId) : Number(rawId)
      }

      return {
        success: true,
        chatId,
        title: options.title,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Add bot to group as administrator
   * @param chatId The group chat ID (negative, like -1001234567890)
   * @param botUsername The bot username (without @)
   * @param permissions Admin permissions to grant
   */
  async addBotAsAdmin(
    chatId: number,
    botUsername: string,
    permissions: BotAdminPermissions = {}
  ): Promise<{ success: boolean; error?: string }> {
    const tgClient = this.client.getClient()

    try {
      // Get channel entity to fetch access hash
      const channelEntity = await this.getChannelEntity(chatId)
      if (!channelEntity) {
        return { success: false, error: 'Could not resolve channel entity' }
      }

      // Resolve the bot username
      const botEntity = await tgClient.getEntity(botUsername)
      if (!botEntity) {
        return { success: false, error: 'Could not resolve bot entity' }
      }

      const { Api } = await import('telegram/tl/index.js')

      // @ts-ignore - EditAdmin exists but type might be incomplete
      await tgClient.invoke(new Api.channels.EditAdmin({
        // @ts-ignore - InputPeerChannel constructor exists
        channel: new Api.InputPeerChannel({
          channelId: toBigInteger(this.extractChannelId(chatId)),
          accessHash: toBigInteger(channelEntity.accessHash),
        }),
        userId: botEntity,
        adminRights: new Api.ChatAdminRights({
          anonymous: false,
          manageTopics: permissions.canManageTopics ?? true,
          deleteMessages: permissions.canDeleteMessages ?? true,
          editMessages: permissions.canEditMessages ?? false,
          inviteUsers: permissions.canInviteUsers ?? true,
          banUsers: permissions.canBanUsers ?? true,
          pinMessages: permissions.canPinMessages ?? true,
          addAdmins: false,
          manageCall: false,
          other: false,
          changeInfo: true,
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
   * Get invite link for a group
   * @param chatId The group chat ID
   */
  async getInviteLink(chatId: number): Promise<{ success: boolean; link?: string; error?: string }> {
    const tgClient = this.client.getClient()

    try {
      // Get channel entity to fetch access hash
      const channelEntity = await this.getChannelEntity(chatId)
      if (!channelEntity) {
        return { success: false, error: 'Could not resolve channel entity' }
      }

      const { Api } = await import('telegram/tl/index.js')

      // @ts-ignore - ExportInvite exists but type might be incomplete
      const result = await tgClient.invoke(new Api.channels.ExportInvite({
        // @ts-ignore - InputPeerChannel constructor exists
        channel: new Api.InputPeerChannel({
          channelId: toBigInteger(this.extractChannelId(chatId)),
          accessHash: toBigInteger(channelEntity.accessHash),
        }),
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

  /**
   * Get chat information
   * @param chatId The chat ID
   */
  async getChatInfo(chatId: number): Promise<{
    success: boolean
    title?: string
    type?: string
    isForum?: boolean
    error?: string
  }> {
    const tgClient = this.client.getClient()

    try {
      const entity = await tgClient.getEntity(chatId)

      if (!entity) {
        return {
          success: false,
          error: 'Could not resolve entity',
        }
      }

      // @ts-ignore - className exists at runtime
      if (entity.className === 'Channel' || entity.className === 'ChannelForbidden') {
        const channel = entity as any
        return {
          success: true,
          title: channel.title ?? undefined,
          type: channel.megagroup ? 'supergroup' : 'channel',
          isForum: channel.forum ?? false,
        }
      }
      // @ts-ignore
      else if (entity.className === 'Chat') {
        const chat = entity as any
        return {
          success: true,
          title: chat.title ?? undefined,
          type: 'group',
          isForum: false,
        }
      }

      return {
        success: false,
        error: 'Unknown chat type',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get channel entity with access hash
   * @param chatId The chat ID
   */
  private async getChannelEntity(chatId: number): Promise<{ accessHash: bigint } | null> {
    const tgClient = this.client.getClient()

    try {
      const entity = await tgClient.getEntity(chatId)

      // Check if entity has accessHash
      if (entity && typeof entity === 'object' && 'accessHash' in entity) {
        const typedEntity = entity as { accessHash: bigint | any }
        const hash = typedEntity.accessHash

        // Return as bigint (native)
        if (typeof hash === 'bigint') {
          return { accessHash: hash }
        }

        // Convert BigInteger to bigint if needed
        if (hash && typeof hash === 'object' && 'value' in hash) {
          return { accessHash: BigInt(hash.value.toString()) }
        }

        return { accessHash: hash }
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Extract channel ID from chat ID
   * Chat IDs for supergroups are like -1001234567890
   * Channel IDs are the positive part: 1234567890
   */
  private extractChannelId(chatId: number): number {
    // For supergroups, chatId is typically -100xxxxxx
    // We need the absolute value for channelId
    const abs = Math.abs(chatId)

    // If it starts with 100 (e.g., -1001234567890), strip the 100
    // to get the actual channel ID
    if (abs >= 1000000000 && abs.toString().startsWith('100')) {
      return parseInt(abs.toString().substring(3))
    }

    // Otherwise just return absolute value
    return abs
  }
}
