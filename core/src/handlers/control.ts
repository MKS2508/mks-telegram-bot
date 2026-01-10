import type { Context } from 'telegraf'
import { updateConfig, getConfig } from '../config/index.js'
import { botLogger, controlLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import { botManager } from '../utils/bot-manager.js'
import { TelegramMessageBuilder } from '@mks2508/telegram-message-builder'

export async function handleStop(ctx: Context): Promise<void> {
  const userId = ctx.from?.id ?? 'unknown'

  botLogger.info(
    `${badge('CONTROL', 'rounded')} ${kv({
      cmd: colorText('/stop', colors.command),
      user: colorText(String(userId), colors.user),
    })}`
  )

  const message = TelegramMessageBuilder.text()
    .text('🛑 Shutting down bot...')
    .build()
  ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })
  process.exit(0)
}

export async function handleRestart(ctx: Context): Promise<void> {
  const userId = ctx.from?.id ?? 'unknown'

  botLogger.info(
    `${badge('CONTROL', 'rounded')} ${kv({
      cmd: colorText('/restart', colors.command),
      user: colorText(String(userId), colors.user),
    })}`
  )

  const message1 = TelegramMessageBuilder.text()
    .text('🔄 Restarting bot...')
    .build()
  ctx.reply(message1.text || '', { parse_mode: (message1.parse_mode || 'HTML') as any })

  botManager.resetStats()

  const message2 = TelegramMessageBuilder.text()
    .text('✅ Bot stats reset. Restarting...')
    .build()
  ctx.reply(message2.text || '', { parse_mode: (message2.parse_mode || 'HTML') as any })
  process.exit(0)
}

export async function handleMode(ctx: Context): Promise<void> {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : ''
  const parts = text.split(' ')
  const mode = parts[1] as 'polling' | 'webhook' | undefined

  if (!mode || (mode !== 'polling' && mode !== 'webhook')) {
    const config = getConfig()
    const message = TelegramMessageBuilder.text()
      .title('📡 Current Mode')
      .newline()
      .line('Mode', config.mode, { code: true })
      .newline()
      .text('Usage: /mode <polling|webhook>')
      .build()

    ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })
    return
  }

  if (mode === 'webhook') {
    const config = getConfig()
    if (!config.webhookUrl) {
      const message = TelegramMessageBuilder.text()
        .text('❌ Webhook URL not configured. Set TG_WEBHOOK_URL environment variable.')
        .build()
      ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })
      return
    }
  }

  updateConfig({ mode })

  const message = TelegramMessageBuilder.text()
    .text('✅ Mode changed to:')
    .line('Mode', mode, { code: true })
    .build()

  ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })

  controlLogger.info(
    `${badge('MODE', 'rounded')} ${kv({
      newMode: colorText(mode, colors.info),
      user: ctx.from?.id ?? 'unknown',
    })}`
  )
}

export async function handleWebhook(ctx: Context): Promise<void> {
  const config = getConfig()

  if (config.mode !== 'webhook') {
    const message = TelegramMessageBuilder.text()
      .text('❌ Bot is not in webhook mode. Use /mode webhook first.')
      .build()
    ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })
    return
  }

  const message = TelegramMessageBuilder.text()
    .title('🔗 Webhook Configuration')
    .newline()
    .line('URL', config.webhookUrl || 'Not set', { code: true })
    .build()

  ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })

  controlLogger.info(
    `${badge('WEBHOOK', 'rounded')} ${kv({
      url: config.webhookUrl ?? 'not configured',
      user: ctx.from?.id ?? 'unknown',
    })}`
  )
}
