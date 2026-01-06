import type { Context } from 'telegraf'
import { updateConfig, getConfig } from '../config/index.js'
import { botLogger, controlLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import { botManager } from '../utils/bot-manager.js'

export async function handleStop(ctx: Context): Promise<void> {
  const userId = ctx.from?.id ?? 'unknown'

  botLogger.info(
    `${badge('CONTROL', 'rounded')} ${kv({
      cmd: colorText('/stop', colors.command),
      user: colorText(String(userId), colors.user),
    })}`
  )

  ctx.reply('🛑 Shutting down bot...')
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

  ctx.reply('🔄 Restarting bot...')
  botManager.resetStats()
  ctx.reply('✅ Bot stats reset. Restarting...')
  process.exit(0)
}

export async function handleMode(ctx: Context): Promise<void> {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : ''
  const parts = text.split(' ')
  const mode = parts[1] as 'polling' | 'webhook' | undefined

  if (!mode || (mode !== 'polling' && mode !== 'webhook')) {
    const config = getConfig()
    ctx.reply(`📡 *Current Mode:* \`${config.mode}\`\n\nUsage: /mode <polling|webhook>`, {
      parse_mode: 'Markdown',
    })
    return
  }

  if (mode === 'webhook') {
    const config = getConfig()
    if (!config.webhookUrl) {
      ctx.reply('❌ Webhook URL not configured. Set TG_WEBHOOK_URL environment variable.')
      return
    }
  }

  updateConfig({ mode })
  ctx.reply(`✅ Mode changed to: \`${mode}\``, { parse_mode: 'Markdown' })

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
    ctx.reply('❌ Bot is not in webhook mode. Use /mode webhook first.')
    return
  }

  const message = `🔗 *Webhook Configuration:*\n\nURL: \`${config.webhookUrl || 'Not set'}\``
  ctx.reply(message, { parse_mode: 'Markdown' })

  controlLogger.info(
    `${badge('WEBHOOK', 'rounded')} ${kv({
      url: config.webhookUrl ?? 'not configured',
      user: ctx.from?.id ?? 'unknown',
    })}`
  )
}
