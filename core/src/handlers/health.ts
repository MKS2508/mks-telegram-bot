import type { Context } from 'telegraf'
import { getConfig } from '../config/index.js'
import { formatHealthMessage, formatUptime } from '../utils/formatters.js'
import { MessageBuilder } from '../utils/message-builder.js'
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

  const builder = MessageBuilder.markdown()
    .title('⏱️ Uptime:')
    .text(formatUptime(uptime))

  await ctx.reply(builder.build(), { parse_mode: builder.getParseMode() })
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

  const builder = MessageBuilder.markdown()
    .title('📊 Bot Statistics')
    .newline()
    .section('Performance')
    .line('Messages Processed', '0')
    .line('Commands Executed', '0')
    .line('Errors Encountered', '0')
    .newline()
    .section('Configuration')
    .line('Mode', config.mode.toUpperCase())
    .line('Log Level', config.logLevel.toUpperCase())
    .line('Logging Enabled', config.logChatId ? '✅' : '❌')
    .line('Control Enabled', config.controlChatId ? '✅' : '❌')

  await ctx.reply(builder.build(), { parse_mode: builder.getParseMode() })
}
