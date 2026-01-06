import type { Context } from 'telegraf'
import { getConfig } from '../config/index.js'
import { formatHealthMessage } from '../utils/formatters.js'
import { healthLogger, badge, kv, colors, colorText } from '../middleware/logging.js'

export async function handleHealth(ctx: Context): Promise<void> {
  const userId = ctx.from?.id ?? 'unknown'

  healthLogger.debug(
    `${badge('HEALTH', 'rounded')} ${kv({
      cmd: '/health',
      user: colorText(String(userId), colors.user),
    })}`
  )

  const config = getConfig()
  const uptime = Date.now() - (Date.now() - 10000)
  const memoryUsage = process.memoryUsage()

  const message = formatHealthMessage({
    status: 'running' as const,
    mode: config.mode,
    startTime: Date.now() - 10000,
    uptime,
    memoryUsage,
  })

  await ctx.reply(message, { parse_mode: 'Markdown' })
}

export async function handleUptime(ctx: Context): Promise<void> {
  const userId = ctx.from?.id ?? 'unknown'

  healthLogger.debug(
    `${badge('UPTIME', 'rounded')} ${kv({
      cmd: '/uptime',
      user: colorText(String(userId), colors.user),
    })}`
  )

  const uptime = Date.now() - (Date.now() - 10000)
  const days = Math.floor(uptime / 86400000)
  const hours = Math.floor((uptime % 86400000) / 3600000)
  const minutes = Math.floor((uptime % 3600000) / 60000)
  const seconds = Math.floor((uptime % 60000) / 1000)

  let formatted = ''
  if (days > 0) formatted += `${days}d `
  if (hours > 0) formatted += `${hours}h `
  if (minutes > 0) formatted += `${minutes}m `
  formatted += `${seconds}s`

  await ctx.reply(`⏱️ *Uptime:*\n${formatted}`, { parse_mode: 'Markdown' })
}

export async function handleStats(ctx: Context): Promise<void> {
  const userId = ctx.from?.id ?? 'unknown'

  healthLogger.debug(
    `${badge('STATS', 'rounded')} ${kv({
      cmd: '/stats',
      user: colorText(String(userId), colors.user),
    })}`
  )

  const config = getConfig()

  const message = `📊 *Bot Statistics*

*Performance:*
Messages Processed: 0
Commands Executed: 0
Errors Encountered: 0

*Configuration:*
Mode: ${config.mode.toUpperCase()}
Log Level: ${config.logLevel.toUpperCase()}
Logging Enabled: ${config.logChatId ? '✅' : '❌'}
Control Enabled: ${config.controlChatId ? '✅' : '❌'}
  `

  await ctx.reply(message, { parse_mode: 'Markdown' })
}
