import { TimeConstants } from '../types/constants.js'
import type { BotStatus } from '../types/bot.js'
import { TelegramMessageBuilder, fmt } from '@mks2508/telegram-message-builder'

// Re-export fmt from telegram-message-builder for convenience
export { fmt }

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
 * Format a log entry message for Telegram
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

  return `${emoji} [${component}] ${message}\n${fmt.italic(timestamp)}`
}
