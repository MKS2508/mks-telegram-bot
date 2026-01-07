import type { Context } from 'telegraf'
import { badge, kv, colors, colorText } from '../middleware/logging.js'
import { getConfig } from '../config/index.js'
import { configLogger } from '@mks2508/telegram-bot-utils'
import { MessageBuilder } from '../utils/message-builder.js'

const collectedTopics = new Map<number, string>()

export async function handleExportConfig(ctx: Context): Promise<void> {
  const userId = ctx.from?.id ?? 'unknown'
  const chat = ctx.chat

  configLogger.info(
    `${badge('CONFIG', 'rounded')} ${kv({
      cmd: '/exportconfig',
      user: colorText(String(userId), colors.user),
      chat: chat?.id,
    })}`
  )

  const config = getConfig()
  const builder = MessageBuilder.markdown()

  // Title
  builder.title('🔧 Current Configuration')
  builder.newline()

  // Environment
  builder.section('Environment:')
  builder.line('TG_ENV', config.environment, { code: true })
  builder.line('TG_INSTANCE_NAME', config.instanceName, { code: true })
  builder.line('TG_MODE', config.mode, { code: true })
  builder.newline()

  // Bot Token (masked)
  if (config.botToken) {
    const masked = config.botToken.slice(0, 6) + '...' + config.botToken.slice(-6)
    builder.section('Bot:')
    builder.line('TG_BOT_TOKEN', masked, { code: true })
    builder.newline()
  }

  // Control
  builder.section('Control Commands:')
  if (config.controlChatId) {
    builder.line('TG_CONTROL_CHAT_ID', String(config.controlChatId), { code: true })
  } else {
    builder.text('# TG_CONTROL_CHAT_ID=not_set')
  }
  if (config.controlTopicId) {
    builder.line('TG_CONTROL_TOPIC_ID', String(config.controlTopicId), { code: true })
  } else {
    builder.text('# TG_CONTROL_TOPIC_ID=not_set')
  }
  if (config.authorizedUserIds && config.authorizedUserIds.size > 0) {
    builder.line('TG_AUTHORIZED_USER_IDS', [...config.authorizedUserIds].join(','), { code: true })
    builder.newline()
  } else {
    builder.text('# TG_AUTHORIZED_USER_IDS=not_set')
    builder.newline()
  }

  // Logging
  builder.section('Logging:')
  if (config.logChatId) {
    builder.line('TG_LOG_CHAT_ID', String(config.logChatId), { code: true })
  } else {
    builder.text('# TG_LOG_CHAT_ID=not_set')
  }
  if (config.logTopicId) {
    builder.line('TG_LOG_TOPIC_ID', String(config.logTopicId), { code: true })
    builder.newline()
  } else {
    builder.text('# TG_LOG_TOPIC_ID=not_set')
    builder.newline()
  }

  // Webhook
  if (config.mode === 'webhook') {
    builder.section('Webhook:')
    builder.line('TG_WEBHOOK_URL', config.webhookUrl || 'not_set', { code: true })
    builder.line('TG_WEBHOOK_SECRET', config.webhookSecret || 'not_set', { code: true })
    builder.newline()
  }

  builder.newline()
  builder.text('💡 Copy this to your .env file')
  builder.newline()
  builder.newline()

  // Instructions
  builder.section('📋 Quick Setup:')
  builder.listItem('Create topics: General, Control, Logs')
  builder.listItem('Mention @bot_username in each topic')
  builder.listItem('Use /getinfo to get Thread IDs')
  builder.listItem('Update .env with the IDs')

  await ctx.reply(builder.build(), { parse_mode: builder.getParseMode() })
  configLogger.success(`Config exported for user ${userId}`)
}

/**
 * Register a topic when user mentions bot in a topic
 * Call this from the mention middleware
 */
export function registerTopic(threadId: number, topicName: string): void {
  collectedTopics.set(threadId, topicName)
}

/**
 * Get all collected topics
 */
export function getCollectedTopics(): Map<number, string> {
  return collectedTopics
}

/**
 * Clear collected topics
 */
export function clearCollectedTopics(): void {
  collectedTopics.clear()
}
