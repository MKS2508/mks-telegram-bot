import type { Telegraf } from 'telegraf'
import type { BotStatus, BotStats } from '../types/bot.js'
import { ok, type Result, err, type BotError } from './result.js'
import { botError } from '../types/result.js'
import { botLogger } from '../middleware/logging.js'
import { getConfig } from '../config/index.js'

class BotManager {
  private bot: Telegraf | null = null
  private startTime: number | null = null
  private stats: BotStats = {
    messagesProcessed: 0,
    commandsExecuted: 0,
    errorsEncountered: 0,
    uptimeStart: 0,
    lastActivity: 0,
  }

  constructor() {
    this.stats.uptimeStart = Date.now()
  }

  setBot(bot: Telegraf): void {
    this.bot = bot
    this.startTime = Date.now()
  }

  getStatus(): Result<BotStatus, BotError> {
    const config = getConfig()
    const uptime = this.startTime ? Date.now() - this.startTime : 0

    return ok({
      status: this.bot ? 'running' : 'stopped',
      mode: config.mode,
      startTime: this.startTime,
      uptime,
      memoryUsage: process.memoryUsage(),
    })
  }

  getStats(): Result<BotStats, BotError> {
    return ok({ ...this.stats })
  }

  incrementMessages(): void {
    this.stats.messagesProcessed++
    this.stats.lastActivity = Date.now()
  }

  incrementCommands(): void {
    this.stats.commandsExecuted++
    this.stats.lastActivity = Date.now()
  }

  incrementErrors(): void {
    this.stats.errorsEncountered++
    this.stats.lastActivity = Date.now()
  }

  resetStats(): Result<void, BotError> {
    this.stats = {
      messagesProcessed: 0,
      commandsExecuted: 0,
      errorsEncountered: 0,
      uptimeStart: Date.now(),
      lastActivity: 0,
    }
    this.startTime = Date.now()
    botLogger.info('Bot stats reset')
    return ok(undefined)
  }

  authorize(userId: number): Result<void, BotError> {
    const config = getConfig()

    if (!config.authorizedUserIds.has(userId)) {
      return err(botError('UNAUTHORIZED', `User ${userId} is not authorized`))
    }

    return ok(undefined)
  }

  async start(bot: Telegraf, mode?: 'polling' | 'webhook'): Promise<Result<void, BotError>> {
    const config = getConfig()
    const targetMode = mode || config.mode

    if (targetMode === 'webhook' && !config.webhookUrl) {
      return err(botError('WEBHOOK_NOT_CONFIGURED', 'Webhook URL not configured'))
    }

    if (targetMode === 'webhook') {
      botLogger.info(`Starting bot in webhook mode: ${config.webhookUrl}`)
    } else {
      botLogger.info('Starting bot in polling mode')
    }

    this.bot = bot
    this.startTime = Date.now()

    return ok(undefined)
  }

  async stop(reason?: string): Promise<Result<void, BotError>> {
    if (!this.bot) {
      return err(botError('BOT_NOT_RUNNING', 'Bot is not running'))
    }

    botLogger.info(`Stopping bot${reason ? `: ${reason}` : ''}`)
    this.bot.stop(reason || 'SIGINT')
    this.bot = null
    this.startTime = null

    return ok(undefined)
  }

  async restart(): Promise<Result<void, BotError>> {
    if (!this.bot) {
      return err(botError('BOT_NOT_RUNNING', 'Cannot restart: bot is not running'))
    }

    botLogger.info('Restarting bot')
    await this.stop('restart')
    this.startTime = Date.now()

    return ok(undefined)
  }
}

export const botManager = new BotManager()
