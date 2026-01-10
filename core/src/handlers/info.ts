import type { Context } from 'telegraf'
import { infoLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import { TelegramMessageBuilder } from '@mks2508/telegram-message-builder'

export async function handleGetInfo(ctx: Context): Promise<void> {
  const userId = ctx.from?.id ?? 'unknown'
  const botUsername = ctx.me

  infoLogger.info(
    `${badge('INFO', 'rounded')} ${kv({
      cmd: '/getinfo',
      user: colorText(String(userId), colors.user),
    })}`
  )

  const msg = ctx.message
  const from = ctx.from
  const chat = ctx.chat

  const builder = TelegramMessageBuilder.text()
    .title('📋 Your Information')
    .newline()

  // User info
  if (from) {
    builder.section('👤 User Info:')
      .line('User ID', String(from.id), { code: true })
    if (from.username) builder.line('Username', `@${from.username}`)
    if (from.first_name) builder.line('First Name', from.first_name)
    if (from.last_name) builder.line('Last Name', from.last_name)
    if (from.language_code) builder.line('Language', from.language_code)
    if (from.is_premium) builder.line('Premium', 'Yes')
    builder.newline()
  }

  // Chat info
  if (chat) {
    builder.section('💬 Chat Info:')
      .line('Chat ID', String(chat.id), { code: true })
      .line('Type', chat.type)
    if ('title' in chat && chat.title) builder.line('Title', chat.title)
    if ('username' in chat && chat.username) builder.line('Username', `@${chat.username}`)
    if (chat.type === 'supergroup' || chat.type === 'group') {
      builder.line('Chat ID (for config)', String(chat.id), { code: true })
    }
    builder.newline()
  }

  // Bot mention detection
  if (msg && 'entities' in msg && botUsername) {
    const botMention = detectBotMention(msg as unknown as MaybeMessage, botUsername)
    if (botMention.isMentioned) {
      builder.section('🤖 Bot Mention:')
        .line('Bot mentioned', 'Yes')
      if (botMention.type) builder.line('Mention type', botMention.type)
      if (botMention.replyToBot) builder.text('Replying to bot message')
      builder.newline()
      infoLogger.info(`Bot mentioned in chat ${chat?.id} by user ${userId}`)
    }
  }

  // Message/Topic info
  if (msg) {
    builder.section('📮 Message Info:')
      .line('Message ID', String(msg.message_id))
    if ('reply_to_message' in msg && msg.reply_to_message) {
      const replyTo = msg.reply_to_message
      builder.line('Reply to message ID', String(replyTo.message_id))
    }
  }

  // Thread/Topic info (from forum topics)
  const threadId = getThreadId(msg as unknown as MaybeMessage)
  if (threadId) {
    builder.newline()
      .section('🧵 Thread/Topic:')
      .line('Thread ID', String(threadId), { code: true })
      .text('This message is in a topic')
      .newline()
    infoLogger.info(`Message sent in thread ${threadId} by user ${userId}`)
  }

  // Configuration tips
  builder.newline()
    .section('🔧 Configuration:')
    .line('TG_CONTROL_CHAT_ID', String(chat?.id ?? 'N/A'), { code: true })
    .line('TG_AUTHORIZED_USER_IDS', String(from?.id ?? 'N/A'))
  if (threadId) {
    builder.line('TG_CONTROL_TOPIC_ID', String(threadId), { code: true })
  }

  builder.newline()
    .text('💡 Copy these values to your .env file')
    .newline()
    .newline()
    .text('💡 Tip: In groups, you can also mention the bot with @username to get this info')

  const message = builder.build()
  infoLogger.info(`Replying to user ${userId} with info`)
  await ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })
  infoLogger.success(`Info sent to user ${userId}`)
}

interface BotMentionResult {
  isMentioned: boolean
  type?: 'mention' | 'text_mention' | 'reply'
  replyToBot?: boolean
}

function detectBotMention(msg: MaybeMessage, botUsername: string): BotMentionResult {
  const result: BotMentionResult = {
    isMentioned: false,
  }

  // Check if replying to a bot message
  if ('reply_to_message' in msg && msg.reply_to_message) {
    const replyTo = msg.reply_to_message
    if ('from' in replyTo && replyTo.from?.id) {
      result.replyToBot = true
      result.isMentioned = true
      result.type = 'reply'
      return result
    }
  }

  // Check for @mention entities
  if ('entities' in msg && msg.entities && 'text' in msg && msg.text) {
    const text = msg.text
    for (const entity of msg.entities) {
      if ('type' in entity && entity.type === 'mention') {
        const mention = text.substring(entity.offset, entity.offset + entity.length)
        if (mention === `@${botUsername}`) {
          result.isMentioned = true
          result.type = 'mention'
          return result
        }
      }
      if ('type' in entity && entity.type === 'text_mention') {
        result.isMentioned = true
        result.type = 'text_mention'
        return result
      }
    }
  }

  return result
}

/**
 * Get thread ID from a message
 * Checks multiple possible locations where thread_id can be stored
 */
function getThreadId(msg: MaybeMessage): number | undefined {
  if (!msg) return undefined

  // Direct thread_id property (forum topics)
  if ('thread_id' in msg && typeof msg.thread_id === 'number') {
    return msg.thread_id
  }

  // message_thread_id (alternative property)
  if ('message_thread_id' in msg && typeof msg.message_thread_id === 'number') {
    return msg.message_thread_id
  }

  // Check in reply_to_message
  if ('reply_to_message' in msg && msg.reply_to_message) {
    const replyTo = msg.reply_to_message

    if ('thread_id' in replyTo && typeof replyTo.thread_id === 'number') {
      return replyTo.thread_id
    }

    if ('message_thread_id' in replyTo && typeof replyTo.message_thread_id === 'number') {
      return replyTo.message_thread_id
    }
  }

  return undefined
}

// Type for message objects that might have various properties
type MaybeMessage = Record<string, unknown> & {
  reply_to_message?: MaybeMessage & { from?: { id?: number } }
  entities?: Array<{ type?: string; offset: number; length: number }>
  text?: string
  thread_id?: number
  message_thread_id?: number
}
