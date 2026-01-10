import type { Context } from 'telegraf'
import { getConfig } from '../config/index.js'
import { formatUptime } from '../utils/formatters.js'
import { TelegramMessageBuilder } from '@mks2508/telegram-message-builder'
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

  const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2)

  const message = TelegramMessageBuilder.text()
    .title('🏥 Bot Health Status')
    .newline()
    .line('Status', 'RUNNING', { bold: true })
    .line('Mode', config.mode.toUpperCase())
    .line('Uptime', formatUptime(uptime))
    .newline()
    .section('Memory Usage')
    .text(`RSS: ${mb(memoryUsage.rss)}MB`)
    .text(`Heap: ${mb(memoryUsage.heapUsed)}/${mb(memoryUsage.heapTotal)}MB`)
    .build()

  await ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })
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

  const message = TelegramMessageBuilder.text()
    .title('⏱️ Uptime:')
    .text(formatUptime(uptime))
    .build()

  await ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })
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

  const message = TelegramMessageBuilder.text()
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
    .build()

  await ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })
}
