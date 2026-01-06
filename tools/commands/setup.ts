import { Command } from 'commander'
import { readFile, writeFile, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import { input, select, confirm } from '@inquirer/prompts'
import type { BotCommand } from './index.js'

const cliLogger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  error: (msg: string) => console.error(chalk.red('✗'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  title: (msg: string) => console.log(chalk.cyan.bold('\n' + msg + '\n')),
}

interface SetupCommand extends BotCommand {
  name: 'setup'
  description: string
  register: (program: Command) => void
}

interface SetupOptions {
  token?: string
  mode?: 'polling' | 'webhook'
  environment?: 'local' | 'staging' | 'production'
}

interface SetupConfig {
  TG_BOT_TOKEN: string
  TG_MODE: 'polling' | 'webhook'
  TG_WEBHOOK_URL?: string
  TG_WEBHOOK_SECRET?: string
  TG_ENV: string
  TG_INSTANCE_NAME: string
  TG_LOG_CHAT_ID?: string
  TG_LOG_TOPIC_ID?: number
  TG_CONTROL_CHAT_ID?: string
  TG_CONTROL_TOPIC_ID?: number
  TG_AUTHORIZED_USER_IDS?: string
  LOG_LEVEL?: string
}

const command: SetupCommand = {
  name: 'setup',
  description: 'Interactive environment setup',

  register(program: Command) {
    program
      .command('setup')
      .description('Configure environment variables interactively')
      .option('-t, --token <value>', 'Bot token from @BotFather')
      .option('-m, --mode <polling|webhook>', 'Bot operation mode')
      .option('-e, --environment <local|staging|production>', 'Target environment', 'local')
      .action(async (options) => {
        await handleSetup(options)
      })
  },
}

export default command

async function handleSetup(options: SetupOptions): Promise<void> {
  cliLogger.title('mks-telegram-bot Setup')

  const environment = options.environment ?? 'local'
  const envFile = join(process.cwd(), 'core', `.env.${environment}`)
  const envExample = join(process.cwd(), 'core', '.env.example')

  // Check if .env file already exists
  if (existsSync(envFile)) {
    cliLogger.warn(`Environment file already exists: ${envFile}`)

    const shouldContinue = await confirm({
      message: 'Do you want to overwrite it?',
      default: false,
    })

    if (!shouldContinue) {
      cliLogger.info('Setup cancelled')
      return
    }
  }

  // Copy .env.example to .env.{environment}
  if (!existsSync(envFile) && existsSync(envExample)) {
    await copyFile(envExample, envFile)
    cliLogger.success(`Created ${envFile}`)
  }

  // Read existing env file to preserve comments
  let envContent = ''
  if (existsSync(envFile)) {
    envContent = await readFile(envFile, 'utf-8')
  }

  // Interactive prompts (skip if provided via flags)
  const config: SetupConfig = await gatherConfig(options, envContent)

  // Update env file
  const updatedContent = updateEnvFile(envContent, config)
  await writeFile(envFile, updatedContent, 'utf-8')

  cliLogger.success(`Environment configured: ${envFile}`)
  cliLogger.info('\nNext steps:')
  cliLogger.info('  1. Review the configuration in the env file')
  cliLogger.info('  2. Run: bun run dev')
  cliLogger.info('  3. Send /start to your bot in Telegram')

  // Validate token if provided
  if (config.TG_BOT_TOKEN) {
    await validateToken(config.TG_BOT_TOKEN)
  }
}

async function gatherConfig(options: SetupOptions, _envContent: string): Promise<SetupConfig> {
  const config: Partial<SetupConfig> = {}

  // Bot token
  if (options.token) {
    config.TG_BOT_TOKEN = options.token
  } else {
    cliLogger.info('\nTo get a bot token, open Telegram and talk to @BotFather:')
    cliLogger.info('  1. Send /newbot')
    cliLogger.info('  2. Choose a name for your bot')
    cliLogger.info('  3. Choose a username (must end in "bot")')
    cliLogger.info('  4. Copy the token provided\n')

    config.TG_BOT_TOKEN = await input({
      message: 'Enter your bot token:',
      validate: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Bot token is required'
        }
        if (!value.includes(':')) {
          return 'Invalid token format (should be like 123456:ABC-DEF1234...)'
        }
        return true
      },
    })
  }

  // Mode
  if (options.mode) {
    config.TG_MODE = options.mode
  } else {
    const modeSelection = await select({
      message: 'Select bot operation mode:',
      choices: [
        { name: 'Polling (recommended for development)', value: 'polling' },
        { name: 'Webhook (recommended for production)', value: 'webhook' },
      ],
    })
    config.TG_MODE = modeSelection as 'polling' | 'webhook'
  }

  // Webhook configuration (if webhook mode)
  if (config.TG_MODE === 'webhook') {
    cliLogger.warn('\nWebhook mode requires a public HTTPS endpoint')

    config.TG_WEBHOOK_URL = await input({
      message: 'Enter webhook URL (https://your-domain.com/webhook):',
      validate: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Webhook URL is required for webhook mode'
        }
        if (!value.startsWith('https://')) {
          return 'Webhook URL must use HTTPS'
        }
        return true
      },
    })

    config.TG_WEBHOOK_SECRET = await input({
      message: 'Enter webhook secret (min 16 chars):',
      validate: (value: string) => {
        if (!value || value.length < 16) {
          return 'Webhook secret must be at least 16 characters'
        }
        return true
      },
    })
  }

  // Environment identification
  const envSelection = await select({
    message: 'Select environment:',
    choices: [
      { name: 'Local (development)', value: 'local' },
      { name: 'Staging (testing)', value: 'staging' },
      { name: 'Production', value: 'production' },
    ],
    default: options.environment ?? 'local',
  })
  config.TG_ENV = envSelection

  // Instance name
  config.TG_INSTANCE_NAME = await input({
    message: 'Enter instance name:',
    default: 'mks-bot',
    validate: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Instance name is required'
      }
      return true
    },
  })

  // Optional: Log streaming
  const enableLogStreaming = await confirm({
    message: 'Enable log streaming to Telegram?',
    default: false,
  })

  if (enableLogStreaming) {
    cliLogger.info('\nTo get chat IDs:')
    cliLogger.info('  1. Add your bot to a group or channel')
    cliLogger.info('  2. Send a message to the bot')
    cliLogger.info('  3. Use: bun run cli status --json to see updates')
    cliLogger.info('  4. Or use @GetTelegraphBot in Telegram\n')

    config.TG_LOG_CHAT_ID = await input({
      message: 'Enter log chat ID (optional, press Enter to skip):',
    })

    if (config.TG_LOG_CHAT_ID && config.TG_LOG_CHAT_ID.trim().length > 0) {
      const useTopic = await confirm({
        message: 'Use a topic for log messages?',
        default: false,
      })

      if (useTopic) {
        const topicId = await input({
          message: 'Enter topic ID:',
          validate: (value: string) => {
            const num = Number.parseInt(value, 10)
            if (Number.isNaN(num)) {
              return 'Topic ID must be a number'
            }
            return true
          },
        })
        config.TG_LOG_TOPIC_ID = Number.parseInt(topicId, 10)
      }
    }
  }

  // Optional: Control commands
  const enableControl = await confirm({
    message: 'Enable control commands (/stop, /restart, etc.)?',
    default: false,
  })

  if (enableControl) {
    config.TG_CONTROL_CHAT_ID = await input({
      message: 'Enter control chat ID:',
    })

    if (config.TG_CONTROL_CHAT_ID && config.TG_CONTROL_CHAT_ID.trim().length > 0) {
      const useTopic = await confirm({
        message: 'Use a topic for control messages?',
        default: false,
      })

      if (useTopic) {
        const topicId = await input({
          message: 'Enter topic ID:',
          validate: (value: string) => {
            const num = Number.parseInt(value, 10)
            if (Number.isNaN(num)) {
              return 'Topic ID must be a number'
            }
            return true
          },
        })
        config.TG_CONTROL_TOPIC_ID = Number.parseInt(topicId, 10)
      }
    }

    // Authorized users
    const authUsers = await input({
      message: 'Enter authorized user IDs (comma-separated):',
    })

    if (authUsers && authUsers.trim().length > 0) {
      config.TG_AUTHORIZED_USER_IDS = authUsers
    }
  }

  // Log level
  const logLevel = await select({
    message: 'Select log level:',
    choices: [
      { name: 'Debug (verbose)', value: 'debug' },
      { name: 'Info (default)', value: 'info' },
      { name: 'Warnings only', value: 'warn' },
      { name: 'Errors only', value: 'error' },
    ],
    default: 'info',
  })
  config.LOG_LEVEL = logLevel

  return config as SetupConfig
}

function updateEnvFile(content: string, config: SetupConfig): string {
  const lines = content.split('\n')
  const updated: string[] = []

  for (const line of lines) {
    // Skip empty lines and comments
    if (line.trim().length === 0 || line.trim().startsWith('#')) {
      updated.push(line)
      continue
    }

    const [key] = line.split('=')

    // Update matching keys
    if (key === 'TG_BOT_TOKEN' && config.TG_BOT_TOKEN !== undefined) {
      updated.push(`${key}=${config.TG_BOT_TOKEN}`)
    } else if (key === 'TG_MODE' && config.TG_MODE !== undefined) {
      updated.push(`${key}=${config.TG_MODE}`)
    } else if (key === 'TG_WEBHOOK_URL' && config.TG_WEBHOOK_URL !== undefined) {
      updated.push(`${key}=${config.TG_WEBHOOK_URL}`)
    } else if (key === 'TG_WEBHOOK_SECRET' && config.TG_WEBHOOK_SECRET !== undefined) {
      updated.push(`${key}=${config.TG_WEBHOOK_SECRET}`)
    } else if (key === 'TG_ENV' && config.TG_ENV !== undefined) {
      updated.push(`${key}=${config.TG_ENV}`)
    } else if (key === 'TG_INSTANCE_NAME' && config.TG_INSTANCE_NAME !== undefined) {
      updated.push(`${key}=${config.TG_INSTANCE_NAME}`)
    } else if (key === 'TG_LOG_CHAT_ID' && config.TG_LOG_CHAT_ID !== undefined) {
      updated.push(`${key}=${config.TG_LOG_CHAT_ID}`)
    } else if (key === 'TG_LOG_TOPIC_ID' && config.TG_LOG_TOPIC_ID !== undefined) {
      updated.push(`${key}=${config.TG_LOG_TOPIC_ID}`)
    } else if (key === 'TG_CONTROL_CHAT_ID' && config.TG_CONTROL_CHAT_ID !== undefined) {
      updated.push(`${key}=${config.TG_CONTROL_CHAT_ID}`)
    } else if (key === 'TG_CONTROL_TOPIC_ID' && config.TG_CONTROL_TOPIC_ID !== undefined) {
      updated.push(`${key}=${config.TG_CONTROL_TOPIC_ID}`)
    } else if (key === 'TG_AUTHORIZED_USER_IDS' && config.TG_AUTHORIZED_USER_IDS !== undefined) {
      updated.push(`${key}=${config.TG_AUTHORIZED_USER_IDS}`)
    } else if (key === 'LOG_LEVEL' && config.LOG_LEVEL !== undefined) {
      updated.push(`${key}=${config.LOG_LEVEL}`)
    } else {
      updated.push(line)
    }
  }

  return updated.join('\n')
}

async function validateToken(token: string): Promise<void> {
  cliLogger.info('\nValidating bot token with Telegram API...')

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const data = (await response.json()) as { ok: boolean; result?: { username: string; first_name: string } }

    if (data.ok && data.result) {
      cliLogger.success(`Bot connected: @${data.result.username} (${data.result.first_name})`)
    } else {
      cliLogger.warn('Could not validate token. The bot may not work correctly.')
      cliLogger.info('Make sure the token is correct and try again.')
    }
  } catch {
    cliLogger.warn('Could not reach Telegram API. Check your internet connection.')
  }
}
