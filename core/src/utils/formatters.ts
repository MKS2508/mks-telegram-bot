import { TimeConstants } from '../types/constants.js'
import type { BotStatus } from '../types/bot.js'
import { MessageBuilder, fmt, escapeText, type FormatType } from './message-builder.js'

// Re-export MessageBuilder utilities for convenience
export { MessageBuilder, fmt, escapeText }
export type { FormatType }

// Default format mode for the bot (HTML is simpler and more reliable than MarkdownV2)
export const DEFAULT_FORMAT_MODE: FormatType = 'html'

/**
 * Format uptime in human-readable format
 */
export function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / TimeConstants.SECOND)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Format memory usage in MB
 */
export function formatMemory(memoryUsage: {
  rss: number
  heapTotal: number
  heapUsed: number
  external: number
  arrayBuffers: number
}): string {
  const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2)

  return `RSS: ${mb(memoryUsage.rss)}MB\nHeap: ${mb(memoryUsage.heapUsed)}/${mb(memoryUsage.heapTotal)}MB`
}

/**
 * Format health status message using MessageBuilder
 */
export function formatHealthMessage(status: BotStatus): string {
  return MessageBuilder.markdown()
    .title('🏥 Bot Health Status')
    .newline()
    .line('Status', status.status.toUpperCase(), { bold: true })
    .line('Mode', status.mode.toUpperCase())
    .line('Uptime', formatUptime(status.uptime))
    .newline()
    .title('Memory Usage')
    .text(formatMemory(status.memoryUsage))
    .build()
}

/**
 * Format bot statistics using MessageBuilder
 */
export function formatStats(stats: {
  messagesProcessed: number
  commandsExecuted: number
  errorsEncountered: number
}): string {
  return MessageBuilder.markdown()
    .title('📊 Bot Statistics')
    .newline()
    .section('Performance')
    .line('Messages Processed', String(stats.messagesProcessed))
    .line('Commands Executed', String(stats.commandsExecuted))
    .line('Errors Encountered', String(stats.errorsEncountered))
    .build()
}

/**
 * Format a log entry message
 */
export function formatLogEntry(
  timestamp: string,
  level: string,
  component: string,
  message: string
): string {
  const levelEmoji = {
    info: 'ℹ️',
    success: '✅',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
  }

  const emoji = levelEmoji[level as keyof typeof levelEmoji] || 'ℹ️'

  return MessageBuilder.markdown()
    .text(`${emoji} [${component}] `)
    .text(message)
    .newline()
    .text(fmt.italic(timestamp))
    .build()
}

/**
 * Format error message
 */
export function formatError(error: Error | string): string {
  const message = error instanceof Error ? error.message : String(error)
  return MessageBuilder.markdown()
    .text('❌ ')
    .title('Error:')
    .text(message)
    .build()
}
