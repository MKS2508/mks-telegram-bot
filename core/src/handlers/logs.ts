import type { Context, Telegraf } from 'telegraf'
import { getConfig, hasLoggingConfigured } from '../config/index.js'
import { streamLogger, botLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import { formatLogEntry } from '../utils/formatters.js'
import { TelegramMessageBuilder } from '@mks2508/telegram-message-builder'

const LOG_BUFFER_SIZE = 10
const LOG_BUFFER_TIMEOUT = 5000

class LogStreamer {
  private logBuffer: string[] = []
  private bufferTimeout: NodeJS.Timeout | null = null
  private isEnabled = false

  constructor(private bot: Telegraf) {
    this.isEnabled = hasLoggingConfigured()
  }

  async sendLog(level: string, component: string, message: string): Promise<void> {
    if (!this.isEnabled) return

    const timestamp = new Date().toISOString()
    const formattedLog = formatLogEntry(timestamp, level, component, message)

    this.logBuffer.push(formattedLog)

    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout)
    }

    if (this.logBuffer.length >= LOG_BUFFER_SIZE) {
      await this.flushBuffer()
    } else {
      this.bufferTimeout = setTimeout(() => {
        this.flushBuffer()
      }, LOG_BUFFER_TIMEOUT)
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return

    const config = getConfig()
    if (!config.logChatId) return

    const fullMessage = this.logBuffer.join('\n\n')

    try {
      const extra = {
        parse_mode: 'Markdown' as const,
      }

      if (config.logTopicId) {
        Object.assign(extra, { message_thread_id: config.logTopicId })
      }

      await this.bot.telegram.sendMessage(config.logChatId, fullMessage, extra)
    } catch (error) {
      botLogger.error(
        `${badge('STREAM', 'rounded')} ${kv({
          status: colorText('FAILED', colors.error),
          error: error instanceof Error ? error.message : String(error),
        })}`
      )
    }

    this.logBuffer = []
    this.bufferTimeout = null
  }

  stop(): void {
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout)
    }
    this.flushBuffer()
  }
}

let logStreamer: LogStreamer | null = null

export function initializeLogStreamer(bot: Telegraf): void {
  logStreamer = new LogStreamer(bot)
  streamLogger.success(
    `${badge('STREAM', 'rounded')} ${kv({
      status: colorText('initialized', colors.success),
      bufferSize: LOG_BUFFER_SIZE,
      bufferTimeout: `${LOG_BUFFER_TIMEOUT}ms`,
    })}`
  )
}

export async function sendLogToTelegram(
  level: string,
  component: string,
  message: string
): Promise<void> {
  if (logStreamer) {
    await logStreamer.sendLog(level, component, message)
  }
}

export async function handleLogsCommand(ctx: Context): Promise<void> {
  const config = getConfig()

  if (!hasLoggingConfigured()) {
    const message = TelegramMessageBuilder.text()
      .text('❌ Logging is not configured. Set TG_LOG_CHAT_ID environment variable.')
      .build()
    ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })
    return
  }

  const isEnabled = logStreamer !== null
  const status = isEnabled ? 'enabled' : 'disabled'

  streamLogger.info(
    `${badge('QUERY', 'rounded')} ${kv({
      cmd: '/logs',
      status: colorText(status, isEnabled ? colors.success : colors.dim),
      user: ctx.from?.id ?? 'unknown',
    })}`
  )

  const builder = TelegramMessageBuilder.text()
    .title('📝 Log Streaming Status')
    .newline()
    .line('Status', status, { code: true })
    .line('Chat ID', String(config.logChatId), { code: true })
  if (config.logTopicId) {
    builder.line('Topic ID', String(config.logTopicId), { code: true })
  }

  const message = builder.build()
  ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })
}
