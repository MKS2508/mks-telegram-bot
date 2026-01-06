export interface EnvConfig {
  botToken: string
  mode: 'polling' | 'webhook'
  webhookUrl?: string
  webhookSecret?: string
  logChatId?: string
  logTopicId?: number
  controlChatId?: string
  controlTopicId?: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export interface BotConfig extends EnvConfig {
  authorizedUserIds: Set<number>
  debug?: boolean
  rateLimit?: number
  timeout?: number
  maxRetries?: number
  commandPrefix?: string
}

export interface BotStatus {
  status: 'running' | 'stopped' | 'restarting' | 'error'
  mode: 'polling' | 'webhook'
  startTime: number | null
  uptime: number
  memoryUsage: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
    arrayBuffers: number
  }
}

export interface LogEntry {
  timestamp: string
  level: string
  component: string
  message: string
  metadata?: Record<string, unknown>
}

export interface TelegramLogEntry extends LogEntry {
  chatId?: string
  topicId?: number
}

export interface HealthCheckResult {
  healthy: boolean
  uptime: number
  startTime: number
  memoryUsage: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
    arrayBuffers: number
  }
  messageCount: number
  errorCount: number
}

export interface BotStats {
  messagesProcessed: number
  commandsExecuted: number
  errorsEncountered: number
  uptimeStart: number
  lastActivity: number
}

export interface TopicIds {
  chatId: string
  topicId?: number
}
