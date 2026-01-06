/**
 * Shared logging utilities for mks-telegram-bot monorepo
 * Wraps @mks2508/better-logger with bot-specific presets
 */

import logger, {
  formatKeyValue,
  formatBadge,
  formatWithRightAlign,
  getANSIForeground,
  getColorCapability,
  ANSI,
  type BadgeStyle,
  component,
} from '@mks2508/better-logger'

let colorCapability = getColorCapability()

export function setupLogger(options?: { debug?: boolean; logLevel?: string }) {
  if (options?.debug || options?.logLevel === 'debug') {
    logger.preset('debug')
    logger.showLocation()
  } else {
    logger.preset('cyberpunk')
  }
  logger.showTimestamp()
}

export const botLogger = component('Bot')
export const configLogger = component('Config')
export const commandLogger = component('Command')
export const healthLogger = component('Health')
export const controlLogger = component('Control')
export const streamLogger = component('LogStream')
export const errorLogger = component('Error')

export function kv(data: Record<string, unknown>, separator = ' │ '): string {
  return formatKeyValue(data, colorCapability, { separator })
}

export function badge(name: string, style: BadgeStyle = 'pill'): string {
  return formatBadge(name, style, colorCapability, '#00ffff')
}

export function colorText(text: string, hexColor: string): string {
  if (colorCapability === 'none') return text
  return `${getANSIForeground(hexColor, colorCapability)}${text}${ANSI.reset}`
}

export function withRightAlign(message: string, rightValue: string): string {
  return formatWithRightAlign(message, rightValue)
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}m${secs}s`
}

export const colors = {
  success: '#00ff88',
  error: '#ff4466',
  warning: '#ffaa00',
  info: '#00ffff',
  user: '#ff00ff',
  command: '#ffff00',
  dim: '#888888',
}

export { logger }
