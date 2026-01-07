import { Command } from 'commander'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import { confirm } from '@inquirer/prompts'
import { Telegraf } from 'telegraf'
import type { Context } from 'telegraf'
import ora, { type Ora } from 'ora'
import type { BotCommand } from './index.js'
import {
  createInitialCollectedIds,
  handleListenerMessage,
  type CollectedIds,
} from '../../core/src/handlers/listener.js'

const cliLogger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  error: (msg: string) => console.error(chalk.red('✗'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  title: (msg: string) => console.log(chalk.cyan.bold('\n' + msg + '\n')),
}

interface AutoConfigureCommand extends BotCommand {
  name: 'auto-configure'
  description: string
  register: (program: Command) => void
}

interface AutoConfigureOptions {
  timeout?: number
  environment?: 'local' | 'staging' | 'production'
}

const command: AutoConfigureCommand = {
  name: 'auto-configure',
  description: 'Auto-detect User IDs, Chat IDs, and Topic IDs from messages',

  register(program: Command) {
    program
      .command('auto-configure')
      .description('Automatically detect User IDs, Chat IDs, and Topic IDs from messages')
      .option('-t, --timeout <seconds>', 'Timeout in seconds', '60')
      .option('-e, --environment <local|staging|production>', 'Target environment', 'local')
      .action(async (options) => {
        await handleAutoConfigure(options)
      })
  },
}

export default command
export { handleAutoConfigure }

async function handleAutoConfigure(options: AutoConfigureOptions): Promise<void> {
  cliLogger.title('🔧 Auto-Configure Mode')

  const environment = options.environment ?? 'local'
  const envFile = resolve(process.cwd(), 'core', `.env.${environment}`)

  // Verify .env file exists
  if (!existsSync(envFile)) {
    cliLogger.error(`Environment file not found: ${envFile}`)
    cliLogger.info('Please run "bun run setup" first to create the environment file.')
    return
  }

  // Load bot token from .env file
  const envContent = await readFile(envFile, 'utf-8')
  const botTokenMatch = envContent.match(/^TG_BOT_TOKEN=(.+)$/m)
  const botToken = botTokenMatch?.[1]?.trim()

  if (!botToken) {
    cliLogger.error('TG_BOT_TOKEN not found in environment file')
    cliLogger.info('Please run "bun run setup" first to configure the bot token.')
    return
  }

  const timeoutMs = (options.timeout ?? 60) * 1000

  cliLogger.info(`Environment: ${chalk.cyan(environment)}`)
  cliLogger.info(`Timeout: ${chalk.cyan(timeoutMs / 1000)}s`)
  cliLogger.info(`Bot: ${chalk.green('@' + botToken.split(':')[0])}`)
  cliLogger.info('')

  // Instructions
  cliLogger.title('📋 Instructions')
  console.log('Send messages to the bot from different contexts:')
  console.log('')
  console.log(`  ${chalk.dim('1.')} ${chalk.bold('Direct message')} → Captures ${chalk.cyan('User ID')}`)
  console.log(`  ${chalk.dim('2.')} ${chalk.bold('Mention in group')} → Captures ${chalk.cyan('Chat ID')}`)
  console.log(`  ${chalk.dim('3.')} ${chalk.bold('Message in topic')} → Captures ${chalk.cyan('Topic ID')}`)
  console.log('')
  console.log(`${chalk.yellow('Press Ctrl+C to stop early')}`)
  console.log('')

  const shouldStart = await confirm({
    message: 'Start auto-configure listener?',
    default: true,
  })

  if (!shouldStart) {
    cliLogger.info('Auto-configure cancelled')
    return
  }

  // Start listener bot
  const collected = await startListener(botToken, timeoutMs)

  // Show summary
  cliLogger.title('📊 Captured IDs')
  displayCollectedIds(collected)

  // Ask if user wants to update .env
  if (collected.authorizedUserIds.size === 0 && !collected.controlChatId && !collected.controlTopicId) {
    cliLogger.warn('No IDs were captured. .env file will not be updated.')
    return
  }

  console.log('')
  const shouldUpdate = await confirm({
    message: 'Update .env file with captured IDs?',
    default: true,
  })

  if (shouldUpdate) {
    await updateEnvFile(envFile, envContent, collected)
    cliLogger.success(`Updated ${envFile}`)
  } else {
    cliLogger.info('.env file was not updated')
  }
}

/**
 * Start the listener bot and capture IDs
 */
async function startListener(botToken: string, timeoutMs: number): Promise<CollectedIds> {
  const collected = createInitialCollectedIds()
  const bot = new Telegraf(botToken)

  let spinner: Ora | null = null

  // Setup listener handler
  bot.on('message', async (ctx: Context) => {
    handleListenerMessage(
      ctx,
      collected,
      undefined,
      (_type, _value) => {
        // Update spinner on each capture
        if (spinner) {
          spinner.text = buildSpinnerText(collected)
        }
      }
    )

    // Create/update spinner after first message
    if (!spinner) {
      spinner = ora({
        text: buildSpinnerText(collected),
        color: 'cyan',
      }).start()
    } else {
      spinner.text = buildSpinnerText(collected)
    }
  })

  // Start bot (polling mode for simplicity)
  await bot.launch()

  cliLogger.success('Bot started. Waiting for messages...')
  console.log('')

  // Wait for timeout or user interrupt
  await waitForTimeout(timeoutMs, () => {
    if (spinner) {
      spinner.text = buildSpinnerText(collected)
      spinner.succeed()
    }
  })

  // Stop bot
  await bot.stop()
  console.log('')
  cliLogger.success('Listener stopped')

  return collected
}

/**
 * Wait for timeout with interrupt handler
 */
async function waitForTimeout(timeoutMs: number, onStop: () => void): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      onStop()
      resolve()
    }, timeoutMs)

    process.once('SIGINT', () => {
      clearTimeout(timeout)
      onStop()
      console.log('\n')
      cliLogger.info('Stopped by user (Ctrl+C)')
      resolve()
    })
  })
}

/**
 * Build spinner text with current stats
 */
function buildSpinnerText(collected: CollectedIds): string {
  const parts: string[] = []

  parts.push('Capturing IDs...')

  if (collected.authorizedUserIds.size > 0) {
    parts.push(`Users: ${collected.authorizedUserIds.size}`)
  }

  if (collected.controlChatId) {
    parts.push(`Chat: ${collected.controlChatId}`)
  }

  if (collected.controlTopicId) {
    parts.push(`Ctrl Topic: ${collected.controlTopicId}`)
  }

  if (collected.logTopicId) {
    parts.push(`Log Topic: ${collected.logTopicId}`)
  }

  parts.push(`Msgs: ${collected.messagesCount}`)

  return parts.join(' | ')
}

/**
 * Display collected IDs in a formatted table
 */
function displayCollectedIds(collected: CollectedIds): void {
  if (collected.authorizedUserIds.size > 0) {
    console.log(chalk.cyan('User IDs:'), chalk.green([...collected.authorizedUserIds].join(', ')))
  }

  if (collected.controlChatId) {
    console.log(chalk.cyan('Chat ID:'), chalk.green(String(collected.controlChatId)))
  }

  if (collected.controlTopicId) {
    console.log(chalk.cyan('Control Topic ID:'), chalk.green(String(collected.controlTopicId)))
  }

  if (collected.logTopicId) {
    console.log(chalk.cyan('Log Topic ID:'), chalk.green(String(collected.logTopicId)))
  }

  console.log(chalk.cyan('Messages processed:'), chalk.yellow(String(collected.messagesCount)))
}

/**
 * Update .env file with collected IDs
 */
async function updateEnvFile(envFile: string, content: string, collected: CollectedIds): Promise<void> {
  let updatedContent = content

  // Update TG_AUTHORIZED_USER_IDS
  if (collected.authorizedUserIds.size > 0) {
    const userIds = [...collected.authorizedUserIds].join(',')
    updatedContent = updateEnvVar(updatedContent, 'TG_AUTHORIZED_USER_IDS', userIds)
  }

  // Update TG_CONTROL_CHAT_ID
  if (collected.controlChatId) {
    updatedContent = updateEnvVar(updatedContent, 'TG_CONTROL_CHAT_ID', String(collected.controlChatId))
  }

  // Update TG_CONTROL_TOPIC_ID
  if (collected.controlTopicId) {
    updatedContent = updateEnvVar(updatedContent, 'TG_CONTROL_TOPIC_ID', String(collected.controlTopicId))
  }

  // Update TG_LOG_CHAT_ID
  if (collected.logChatId) {
    updatedContent = updateEnvVar(updatedContent, 'TG_LOG_CHAT_ID', String(collected.logChatId))
  }

  // Update TG_LOG_TOPIC_ID
  if (collected.logTopicId) {
    updatedContent = updateEnvVar(updatedContent, 'TG_LOG_TOPIC_ID', String(collected.logTopicId))
  }

  await writeFile(envFile, updatedContent, 'utf-8')
}

/**
 * Update a single environment variable in the content
 */
function updateEnvVar(content: string, key: string, value: string): string {
  // Check if variable exists (not commented)
  const exists = new RegExp(`^${key}=(.+)$`, 'm').test(content)

  if (exists) {
    // Update existing variable
    return content.replace(new RegExp(`^${key}=(.+)$`, 'm'), `${key}=${value}`)
  }

  // Check if variable is commented out
  const commentedMatch = content.match(new RegExp(`^#\\s*${key}=(.+)$`, 'm'))
  if (commentedMatch) {
    // Uncomment and update
    return content.replace(new RegExp(`^#\\s*${key}=(.+)$`, 'm'), `${key}=${value}`)
  }

  // Add new variable at the end
  return content.trimEnd() + `\n${key}=${value}\n`
}
