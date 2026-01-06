import logger, {
  formatKeyValue,
  formatBadge,
  formatWithRightAlign,
  getANSIForeground,
  getColorCapability,
  ANSI,
  type BadgeStyle,
} from '@mks2508/better-logger'
import { getConfig } from '../config/index.js'

const config = getConfig()
const colorCapability = getColorCapability()

if (config.debug || config.logLevel === 'debug') {
  logger.preset('debug')
  logger.showLocation()
} else {
  logger.preset('cyberpunk')
}

logger.showTimestamp()

export const botLogger = logger.component('Bot')
export const configLogger = logger.component('Config')
export const commandLogger = logger.component('Command')
export const healthLogger = logger.component('Health')
export const controlLogger = logger.component('Control')
export const streamLogger = logger.component('LogStream')
export const errorLogger = logger.component('Error')

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
