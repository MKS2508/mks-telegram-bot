import { TimeConstants } from '../types/constants.js'

export function formatUptime(ms: number): string {
  const days = Math.floor(ms / TimeConstants.DAY)
  const hours = Math.floor((ms % TimeConstants.DAY) / TimeConstants.HOUR)
  const minutes = Math.floor((ms % TimeConstants.HOUR) / TimeConstants.MINUTE)
  const seconds = Math.floor((ms % TimeConstants.MINUTE) / TimeConstants.SECOND)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function formatDuration(ms: number): string {
  return formatUptime(ms)
}

export function formatTimestamp(date: Date): string {
  return date.toISOString()
}

export function getUptime(): number {
  if (typeof process.uptime === 'function') {
    return process.uptime() * 1_000
  }
  return Date.now()
}

export function getProcessUptime(): string {
  const uptime = getUptime()
  return formatUptime(uptime)
}
