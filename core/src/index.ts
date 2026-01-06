import { Telegraf } from 'telegraf'
import { getConfig } from './config/index.js'
import { errorHandler } from './middleware/error-handler.js'
import { topicValidation } from './middleware/topics.js'
import { botLogger, kv, badge, colorText, colors } from './middleware/logging.js'
import { botManager } from './utils/bot-manager.js'
import { getInstanceManager } from './utils/instance-manager.js'
import { handleHealth, handleUptime, handleStats } from './handlers/health.js'
import { handleStop, handleRestart, handleMode, handleWebhook } from './handlers/control.js'
import { handleLogsCommand, initializeLogStreamer } from './handlers/logs.js'
import { auth } from './middleware/auth.js'
import { initializeFileLogging } from './config/logging.js'

async function main(): Promise<void> {
  const config = getConfig()
  const instanceManager = getInstanceManager(config)

  // Initialize file logging first (before any logger usage)
  initializeFileLogging()

  botLogger.info(
    `${badge('START', 'pill')} ${kv({
      environment: colorText(config.environment, colors.info),
      instance: colorText(config.instanceName, colors.dim),
      mode: colorText(config.mode, colors.info),
      logLevel: config.logLevel,
      instanceCheck: config.instanceCheck ? colorText('enabled', colors.success) : colorText('disabled', colors.dim),
    })}`
  )

  // Try to acquire instance lock
  const lockResult = await instanceManager.acquireLock()
  if (!lockResult.ok) {
    botLogger.error(
      `${badge('INSTANCE', 'rounded')} ${kv({
        error: colorText('CONFLICT', colors.error),
        message: lockResult.error.message,
      })}`
    )
    botLogger.error('Cannot start bot due to instance conflict. Exiting...')
    process.exit(1)
  }

  botLogger.info(
    `${badge('CONFIG', 'rounded')} ${kv({
      logging: hasLoggingConfigured()
        ? colorText('yes', colors.success)
        : colorText('no', colors.dim),
      control: hasControlConfigured()
        ? colorText('yes', colors.success)
        : colorText('no', colors.dim),
    })}`
  )

  const bot = new Telegraf(config.botToken)

  botManager.setBot(bot)

  initializeLogStreamer(bot)

  bot.use(errorHandler())
  bot.use(topicValidation())

  bot.command('start', async (ctx) => {
    botLogger.info(
      `${badge('CMD', 'rounded')} ${kv({ cmd: '/start', user: colorText(String(ctx.from?.id), colors.user) })}`
    )
    ctx.reply(
      '👋 *Welcome!* I am a Telegram bot template.\n\n' +
        'Available commands:\n' +
        '/health - Check bot health\n' +
        '/uptime - Show bot uptime\n' +
        '/stats - Show statistics\n' +
        '/logs - Check log streaming status\n' +
        '/mode - Check or change bot mode',
      { parse_mode: 'Markdown' }
    )
    botManager.incrementMessages()
  })

  bot.command('health', handleHealth)
  bot.command('uptime', handleUptime)
  bot.command('stats', handleStats)

  bot.use((ctx, next) => {
    if (ctx.message) {
      botManager.incrementMessages()
    }
    return next()
  })

  if (hasControlConfigured()) {
    bot.use(auth())

    bot.command('stop', handleStop)
    bot.command('restart', handleRestart)
    bot.command('mode', handleMode)
    bot.command('webhook', handleWebhook)

    botLogger.info(
      `${badge('CONTROL', 'rounded')} ${colorText('Commands registered', colors.success)}`
    )
  } else {
    botLogger.warn(
      `${badge('CONTROL', 'rounded')} ${colorText('Commands not registered', colors.warning)} ${kv({ reason: 'no chat ID configured' })}`
    )
  }

  bot.command('logs', handleLogsCommand)

  process.once('SIGINT', async () => {
    botLogger.info(`${badge('SHUTDOWN', 'pill')} ${colorText('SIGINT received', colors.warning)}`)
    await instanceManager.releaseLock()
    bot.stop('SIGINT')
  })

  process.once('SIGTERM', async () => {
    botLogger.info(`${badge('SHUTDOWN', 'pill')} ${colorText('SIGTERM received', colors.warning)}`)
    await instanceManager.releaseLock()
    bot.stop('SIGTERM')
  })

  if (config.mode === 'webhook') {
    if (!config.webhookUrl) {
      throw new Error('TG_WEBHOOK_URL is required for webhook mode')
    }

    botLogger.info(
      `${badge('LAUNCH', 'pill')} ${kv({ mode: colorText('webhook', colors.info), url: config.webhookUrl })}`
    )

    await bot.launch({
      webhook: {
        domain: config.webhookUrl,
        secretToken: config.webhookSecret,
      },
    })
  } else {
    botLogger.info(`${badge('LAUNCH', 'pill')} ${kv({ mode: colorText('polling', colors.info) })}`)
    await bot.launch()
  }

  botLogger.success(
    `${badge('READY', 'pill')} ${colorText('Bot started successfully', colors.success)}`
  )
}

function hasLoggingConfigured(): boolean {
  const config = getConfig()
  return Boolean(config.logChatId)
}

function hasControlConfigured(): boolean {
  const config = getConfig()
  return Boolean(config.controlChatId)
}

main().catch((error) => {
  botLogger.critical('Fatal error starting bot:', error)
  process.exit(1)
})
