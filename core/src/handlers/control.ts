import type { Context } from 'telegraf'
import { updateConfig, getConfig } from '../config/index.js'
import { botLogger, controlLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import { botManager } from '../utils/bot-manager.js'
import { MessageBuilder } from '../utils/message-builder.js'

export async function handleStop(ctx: Context): Promise<void> {
  const userId = ctx.from?.id ?? 'unknown'

  botLogger.info(
    `${badge('CONTROL', 'rounded')} ${kv({
      cmd: colorText('/stop', colors.command),
      user: colorText(String(userId), colors.user),
    })}`
  )

  const message = MessageBuilder.markdown().text('🛑 Shutting down bot...').build()
  ctx.reply(message, { parse_mode: 'Markdown' })
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

  const builder1 = MessageBuilder.markdown()
  builder1.text('🔄 Restarting bot...')
  ctx.reply(builder1.build(), { parse_mode: builder1.getParseMode() })

  botManager.resetStats()

  const builder2 = MessageBuilder.markdown()
  builder2.text('✅ Bot stats reset. Restarting...')
  ctx.reply(builder2.build(), { parse_mode: builder2.getParseMode() })
  process.exit(0)
}

export async function handleMode(ctx: Context): Promise<void> {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : ''
  const parts = text.split(' ')
  const mode = parts[1] as 'polling' | 'webhook' | undefined

  if (!mode || (mode !== 'polling' && mode !== 'webhook')) {
    const config = getConfig()
    const builder = MessageBuilder.markdown()
      .title('📡 Current Mode:')
      .newline()
      .line('Mode', config.mode, { code: true })
      .newline()
      .text('Usage: /mode <polling|webhook>')

    ctx.reply(builder.build(), { parse_mode: builder.getParseMode() })
    return
  }

  if (mode === 'webhook') {
    const config = getConfig()
    if (!config.webhookUrl) {
      const builder = MessageBuilder.markdown()
        .text('❌ Webhook URL not configured. Set TG_WEBHOOK_URL environment variable.')
      ctx.reply(builder.build(), { parse_mode: builder.getParseMode() })
      return
    }
  }

  updateConfig({ mode })

  const builder = MessageBuilder.markdown()
    .text('✅ Mode changed to:')
    .line('Mode', mode, { code: true })

  ctx.reply(builder.build(), { parse_mode: builder.getParseMode() })

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
    const builder = MessageBuilder.markdown()
      .text('❌ Bot is not in webhook mode. Use /mode webhook first.')
    ctx.reply(builder.build(), { parse_mode: builder.getParseMode() })
    return
  }

  const builder = MessageBuilder.markdown()
    .title('🔗 Webhook Configuration:')
    .newline()
    .line('URL', config.webhookUrl || 'Not set', { code: true })

  ctx.reply(builder.build(), { parse_mode: builder.getParseMode() })

  controlLogger.info(
    `${badge('WEBHOOK', 'rounded')} ${kv({
      url: config.webhookUrl ?? 'not configured',
      user: ctx.from?.id ?? 'unknown',
    })}`
  )
}
