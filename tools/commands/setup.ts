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
  botMode?: 'polling' | 'webhook'
  environment?: 'local' | 'staging' | 'production'
  setupMode?: SetupMode
  update?: boolean
  auto?: boolean
  createTopics?: boolean
}

interface SetupConfig {
  TG_BOT_TOKEN?: string
  TG_MODE?: 'polling' | 'webhook'
  TG_WEBHOOK_URL?: string
  TG_WEBHOOK_SECRET?: string
  TG_ENV?: string
  TG_INSTANCE_NAME?: string
  TG_LOG_CHAT_ID?: string
  TG_LOG_TOPIC_ID?: number
  TG_CONTROL_CHAT_ID?: string
  TG_CONTROL_TOPIC_ID?: number
  TG_AUTHORIZED_USER_IDS?: string
  LOG_LEVEL?: string
}

type SetupMode = 'new-bot' | 'add-ids' | 'create-topics' | 'bootstrap' | 'manual'

type SetupContext = {
  envExists: boolean
  hasToken: boolean
  tokenValid: boolean
  hasChatId: boolean
  hasTopics: boolean
}

const command: SetupCommand = {
  name: 'setup',
  description: 'Interactive environment setup',

  register(program: Command) {
    program
      .command('setup')
      .description('Configure environment variables with intelligent flow')
      .option('-t, --token <value>', 'Bot token from @BotFather')
      .option('-m, --bot-mode <polling|webhook>', 'Bot operation mode')
      .option('-e, --environment <local|staging|production>', 'Target environment', 'local')
      .option('--setup-mode <new-bot|add-ids|create-topics|bootstrap|manual>', 'Setup mode (skip prompt)')
      .action(async (options) => {
        await handleSetup(options)
      })
  },
}

export default command

async function handleSetup(options: SetupOptions & { mode?: SetupMode }): Promise<void> {
  cliLogger.title('🚀 mks-telegram-bot Setup')

  const environment = options.environment ?? 'local'
  const envFile = join(process.cwd(), 'core', `.env.${environment}`)
  const envExample = join(process.cwd(), 'core', '.env.example')

  // Pre-check: detect context
  const context = await detectContext(envFile, envExample)
  showContextSummary(context)

  // Determine setup mode
  let setupMode: SetupMode
  if (options.setupMode) {
    setupMode = options.setupMode
  } else {
    setupMode = await selectSetupMode(context)
  }

  cliLogger.info(`\nMode: ${chalk.cyan(setupMode.toUpperCase())}`)
  console.log('')

  // Pre-checks before execution
  const preChecks = await runPreChecks(envFile, environment, setupMode)
  displayPreChecks(preChecks)

  if (!preChecks.canProceed) {
    cliLogger.error('Cannot proceed due to errors. Please fix the issues above and try again.')
    return
  }

  // Create tracker for changes
  const tracker = new SetupTracker()

  try {
    // Execute based on mode
    switch (setupMode) {
      case 'new-bot':
        await setupNewBot(options, envFile, envExample, environment, tracker)
        break
      case 'add-ids':
        await setupAddIds(options, envFile, environment, tracker)
        break
      case 'create-topics':
        await setupCreateTopics(options, envFile, environment, tracker)
        break
      case 'bootstrap':
        await setupBootstrap(options, envFile, environment, tracker)
        break
      case 'manual':
        await setupManual(options, envFile, envExample, environment, tracker)
        break
    }

    tracker.show()
    showFinalSummary(setupMode, environment)
  } catch (error) {
    if (error instanceof Error && error.message === 'CANCELLED') {
      cliLogger.info('\nOperation cancelled')
      return
    }
    throw error
  }
}

/**
 * Detect current context (what exists, what's configured)
 */
async function detectContext(envFile: string, envExample: string): Promise<SetupContext> {
  const envExists = existsSync(envFile)
  let hasToken = false
  let tokenValid = false
  let hasChatId = false
  let hasTopics = false

  if (envExists) {
    const envContent = await readFile(envFile, 'utf-8')
    const tokenMatch = envContent.match(/^TG_BOT_TOKEN=(.+)$/m)
    const chatIdMatch = envContent.match(/^TG_CONTROL_CHAT_ID=(.+)$/m)
    const topicMatch = envContent.match(/^TG_CONTROL_TOPIC_ID=(.+)$/m)

    hasToken = !!tokenMatch?.[1]?.trim()
    hasChatId = !!chatIdMatch?.[1]?.trim()
    hasTopics = !!topicMatch?.[1]?.trim()

    if (hasToken) {
      tokenValid = await validateTokenSilently(tokenMatch![1]!)
    }
  }

  return { envExists, hasToken, tokenValid, hasChatId, hasTopics }
}

/**
 * Show context summary to user
 */
function showContextSummary(context: SetupContext): void {
  console.log('')
  console.log(chalk.bold('Current State:'))
  if (!context.envExists) {
    console.log(`  ${chalk.yellow('●')} Environment file: ${chalk.dim('Not created')}`)
  } else {
    console.log(`  ${chalk.green('●')} Environment file: ${chalk.dim('Exists')}`)
  }

  if (!context.hasToken) {
    console.log(`  ${chalk.yellow('●')} Bot token: ${chalk.dim('Not configured')}`)
  } else if (!context.tokenValid) {
    console.log(`  ${chalk.red('●')} Bot token: ${chalk.dim('Invalid')}`)
  } else {
    console.log(`  ${chalk.green('●')} Bot token: ${chalk.dim('Valid')}`)
  }

  if (!context.hasChatId) {
    console.log(`  ${chalk.yellow('●')} Control Chat ID: ${chalk.dim('Not configured')}`)
  } else {
    console.log(`  ${chalk.green('●')} Control Chat ID: ${chalk.dim('Configured')}`)
  }

  if (!context.hasTopics) {
    console.log(`  ${chalk.yellow('●')} Forum Topics: ${chalk.dim('Not created')}`)
  } else {
    console.log(`  ${chalk.green('●')} Forum Topics: ${chalk.dim('Created')}`)
  }
  console.log('')
}

/**
 * Select setup mode based on context
 */
async function selectSetupMode(context: SetupContext): Promise<SetupMode> {
  const choices = [
    {
      name: '🚀 Setup new bot (recommended for first time)',
      description: 'Setup token + detect IDs + create topics',
      value: 'new-bot',
    },
    {
      name: '🔧 Add IDs to existing bot',
      description: 'Auto-detect Chat/User/Topic IDs',
      value: 'add-ids',
    },
    {
      name: '🧵 Create forum topics',
      description: 'Create topics in existing group',
      value: 'create-topics',
    },
    {
      name: '🤖 Full bootstrap (@BotFather)',
      description: 'Create bot + group + topics from scratch',
      value: 'bootstrap',
    },
    {
      name: '⚙️  Manual configuration',
      description: 'Configure each variable manually',
      value: 'manual',
    },
  ]

  return (await select({
    message: 'What do you want to do?',
    choices,
  })) as SetupMode
}

/**
 * Mode 1: Setup new bot (recommended)
 * - Setup basic config
 * - Auto-configure to detect IDs
 * - Create topics
 */
async function setupNewBot(
  options: SetupOptions,
  envFile: string,
  envExample: string,
  environment: 'local' | 'staging' | 'production',
  tracker: SetupTracker
): Promise<void> {
  cliLogger.title('📋 Step 1: Basic Configuration')

  // Copy .env.example if needed
  if (!existsSync(envFile) && existsSync(envExample)) {
    await copyFile(envExample, envFile)
    cliLogger.success(`Created ${envFile}`)
    tracker.created('Environment file')
  }

  // Gather basic config
  const envContent = existsSync(envFile) ? await readFile(envFile, 'utf-8') : ''
  const config = await gatherBasicConfig(options, envContent)

  // Update env file
  const updatedContent = updateEnvFile(envContent, config, false)
  await writeFile(envFile, updatedContent, 'utf-8')
  cliLogger.success(`Updated ${envFile}`)
  tracker.updated('Bot configuration')

  // Validate token
  if (config.TG_BOT_TOKEN) {
    await validateToken(config.TG_BOT_TOKEN)
  }

  // Step 2: Auto-configure
  cliLogger.title('🔧 Step 2: Auto-Detect IDs')
  const runAuto = await confirm({
    message: 'Auto-detect Chat IDs, User IDs, and Topic IDs?',
    default: true,
  })

  if (runAuto && config.TG_BOT_TOKEN) {
    const { handleAutoConfigure } = await import('./auto-configure.js')
    await handleAutoConfigure({
      timeout: 60,
      environment,
    })
    tracker.updated('Chat and User IDs')
  } else {
    cliLogger.info('Skipping auto-configure')
    tracker.skipped('Auto-configure')
  }

  // Step 3: Create topics
  cliLogger.title('🧵 Step 3: Create Forum Topics')
  const runTopics = await confirm({
    message: 'Create forum topics (General, Control, Logs, Config, Bugs)?',
    default: true,
  })

  if (runTopics && config.TG_BOT_TOKEN) {
    const { handleCreateTopics } = await import('./create-topics.js')
    await handleCreateTopics({ environment })
    tracker.created('Forum topics')
  } else {
    cliLogger.info('Skipping topic creation')
    tracker.skipped('Topic creation')
  }
}

/**
 * Mode 2: Add IDs to existing bot
 * - Only runs auto-configure
 */
async function setupAddIds(
  options: SetupOptions,
  envFile: string,
  environment: 'local' | 'staging' | 'production',
  tracker: SetupTracker
): Promise<void> {
  // Check if bot token exists
  if (!existsSync(envFile)) {
    cliLogger.error(`Environment file not found: ${envFile}`)
    cliLogger.info('Please run setup first to configure the bot token.')
    throw new Error('CANCELLED')
  }

  const envContent = await readFile(envFile, 'utf-8')
  const tokenMatch = envContent.match(/^TG_BOT_TOKEN=(.+)$/m)
  const botToken = tokenMatch?.[1]?.trim()

  if (!botToken) {
    cliLogger.error('TG_BOT_TOKEN not found in environment file')
    throw new Error('CANCELLED')
  }

  cliLogger.info(`Bot token found: ${botToken.slice(0, 10)}...`)

  // Validate token
  const valid = await validateTokenSilently(botToken)
  if (!valid) {
    cliLogger.error('Bot token is invalid. Please run setup to configure a valid token.')
    throw new Error('CANCELLED')
  }

  cliLogger.success('Bot token is valid')

  // Run auto-configure
  cliLogger.info('\n💡 Send messages to your bot from different contexts:')
  cliLogger.info('   - Direct message (DM)')
  cliLogger.info('   - Mention in a group')
  cliLogger.info('   - Reply to a message in a topic')
  cliLogger.info('   Press Ctrl+C when done\n')

  const { handleAutoConfigure } = await import('./auto-configure.js')
  await handleAutoConfigure({
    timeout: 60,
    environment,
  })

  tracker.updated('Chat and User IDs')
}

/**
 * Mode 3: Create topics
 * - Only runs create-topics
 */
async function setupCreateTopics(
  options: SetupOptions,
  envFile: string,
  environment: 'local' | 'staging' | 'production',
  tracker: SetupTracker
): Promise<void> {
  // Check if bot token exists
  if (!existsSync(envFile)) {
    cliLogger.error(`Environment file not found: ${envFile}`)
    throw new Error('CANCELLED')
  }

  const envContent = await readFile(envFile, 'utf-8')
  const tokenMatch = envContent.match(/^TG_BOT_TOKEN=(.+)$/m)
  const chatIdMatch = envContent.match(/^TG_CONTROL_CHAT_ID=(.+)$/m)

  const botToken = tokenMatch?.[1]?.trim()
  const chatId = chatIdMatch?.[1]?.trim()

  if (!botToken) {
    cliLogger.error('TG_BOT_TOKEN not found in environment file')
    throw new Error('CANCELLED')
  }

  if (!chatId) {
    cliLogger.warn('TG_CONTROL_CHAT_ID not found')

    const manualChatId = await input({
      message: 'Enter the Chat ID of the group:',
      validate: validateChatId,
    })

    // Update env file with chat ID
    const updated = updateEnvVar(envContent, 'TG_CONTROL_CHAT_ID', manualChatId)
    await writeFile(envFile, updated, 'utf-8')
    cliLogger.success(`Updated ${envFile}`)
    tracker.updated('Control chat ID')
  }

  // Run create-topics
  cliLogger.info('\n💡 Creating 5 topics for organization:')
  cliLogger.info('   - General: General bot messages')
  cliLogger.info('   - Control: Control command responses')
  cliLogger.info('   - Logs: Error and log messages')
  cliLogger.info('   - Config: Configuration updates')
  cliLogger.info('   - Bugs: Bug reports and issues\n')

  const { handleCreateTopics } = await import('./create-topics.js')
  await handleCreateTopics({ environment })

  tracker.created('Forum topics')
}

/**
 * Mode 4: Full bootstrap
 * - Runs the bootstrap command
 */
async function setupBootstrap(
  options: SetupOptions,
  envFile: string,
  environment: 'local' | 'staging' | 'production',
  tracker: SetupTracker
): Promise<void> {
  cliLogger.title('🤖 Full Bootstrap with @BotFather')
  cliLogger.info('This will create a bot, group, and topics automatically.')
  cliLogger.info('You will need your Telegram API credentials from https://my.telegram.org')
  console.log('')

  cliLogger.info('\n💡 Make sure you have:')
  cliLogger.info('   1. Telegram API credentials (api_id and api_hash)')
  cliLogger.info('   2. Phone number connected to your Telegram account')
  cliLogger.info('   3. A session file or willingness to login\n')

  const proceed = await confirm({
    message: 'Continue with full bootstrap?',
    default: true,
  })

  if (!proceed) {
    throw new Error('CANCELLED')
  }

  // Import and run bootstrap
  cliLogger.info('\nLaunching bootstrap command...\n')
  cliLogger.warn('Full bootstrap is handled by the "bun run bootstrap" command')
  cliLogger.info('Please run: bun run bootstrap')
  cliLogger.info('Or use: bun run cli bootstrap\n')

  tracker.created('Bootstrap setup (manual)')
}

/**
 * Mode 5: Manual configuration
 * - Original detailed setup
 */
async function setupManual(
  options: SetupOptions,
  envFile: string,
  envExample: string,
  environment: 'local' | 'staging' | 'production',
  tracker: SetupTracker
): Promise<void> {
  cliLogger.title('⚙️  Manual Configuration')

  // Check if file exists
  if (existsSync(envFile)) {
    cliLogger.warn(`\nEnvironment file already exists: ${envFile}`)

    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: 'Update specific values', value: 'update' },
        { name: 'Overwrite everything', value: 'overwrite' },
        { name: 'Cancel', value: 'cancel' },
      ],
    })

    if (action === 'cancel') {
      throw new Error('CANCELLED')
    }

    if (action === 'update') {
      options.update = true
    }
  }

  // Copy .env.example if needed
  if (!existsSync(envFile) && existsSync(envExample)) {
    await copyFile(envExample, envFile)
    cliLogger.success(`Created ${envFile}`)
    tracker.created('Environment file')
  }

  const envContent = existsSync(envFile) ? await readFile(envFile, 'utf-8') : ''

  // Gather all config
  const config = await gatherManualConfig(options, envContent, environment)

  // Update env file
  const updatedContent = updateEnvFile(envContent, config, options.update)
  await writeFile(envFile, updatedContent, 'utf-8')

  cliLogger.success(`\nEnvironment configured: ${envFile}`)

  if (options.update) {
    tracker.updated('Configuration')
  } else {
    tracker.created('Configuration')
  }

  // Validate token
  if (config.TG_BOT_TOKEN) {
    await validateToken(config.TG_BOT_TOKEN)
  }
}

/**
 * Gather basic config (token, mode, env)
 */
async function gatherBasicConfig(options: SetupOptions, envContent: string): Promise<SetupConfig> {
  const config: Partial<SetupConfig> = {}

  // Bot token
  if (options.token) {
    config.TG_BOT_TOKEN = options.token
  } else {
    cliLogger.info('\n💡 To get a bot token:')
    cliLogger.info('   1. Open Telegram and talk to @BotFather')
    cliLogger.info('   2. Send /newbot')
    cliLogger.info('   3. Choose a name and username')
    cliLogger.info('   4. Copy the token (format: 123456:ABC-DEF1234...)\n')

    config.TG_BOT_TOKEN = await input({
      message: 'Enter your bot token:',
      validate: validateBotToken,
    })
  }

  // Mode
  if (options.botMode) {
    config.TG_MODE = options.botMode
  } else {
    config.TG_MODE = await select({
      message: 'Select bot operation mode:',
      choices: [
        {
          name: 'Polling (recommended for development)',
          value: 'polling',
          description: 'Bot polls Telegram for updates (simpler setup)',
        },
        {
          name: 'Webhook (recommended for production)',
          value: 'webhook',
          description: 'Telegram sends updates to your server (faster, needs HTTPS)',
        },
      ],
    }) as 'polling' | 'webhook'
  }

  // Webhook config if needed
  if (config.TG_MODE === 'webhook') {
    cliLogger.warn('\n⚠️  Webhook mode requires a public HTTPS endpoint')
    cliLogger.info('   Use ngrok for local testing: bun run ngrok\n')

    config.TG_WEBHOOK_URL = await input({
      message: 'Enter webhook URL:',
      default: 'https://your-domain.com/webhook',
      validate: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Webhook URL is required'
        }
        if (!value.startsWith('https://')) {
          return 'Must use HTTPS'
        }
        return true
      },
    })

    config.TG_WEBHOOK_SECRET = await input({
      message: 'Enter webhook secret:',
      default: 'change-this-secret-in-production',
      validate: (value: string) => {
        if (!value || value.length < 16) {
          return 'Must be at least 16 characters'
        }
        return true
      },
    })
  }

  // Environment
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

  // Log level
  config.LOG_LEVEL = await select({
    message: 'Select log level:',
    choices: [
      { name: 'Debug (verbose)', value: 'debug' },
      { name: 'Info (default)', value: 'info' },
      { name: 'Warnings only', value: 'warn' },
      { name: 'Errors only', value: 'error' },
    ],
    default: 'info',
  })

  return config as SetupConfig
}

/**
 * Gather full manual config
 */
async function gatherManualConfig(options: SetupOptions, envContent: string, environment: string): Promise<SetupConfig> {
  const config = await gatherBasicConfig(options, envContent)

  // Update mode: ask what to update
  let updateWhat: Set<string> | null = null
  if (options.update) {
    cliLogger.info('\n📝 Update mode: select what to update')

    const choices = await select({
      message: 'What do you want to configure?',
      choices: [
        { name: 'Control commands only', value: 'control' },
        { name: 'Everything', value: 'all' },
        { name: 'Skip', value: 'skip' },
      ],
    })

    if (choices === 'skip') {
      throw new Error('CANCELLED')
    }

    updateWhat = choices === 'control'
      ? new Set(['TG_CONTROL_CHAT_ID', 'TG_AUTHORIZED_USER_IDS'])
      : new Set(['TG_BOT_TOKEN', 'TG_MODE', 'TG_WEBHOOK_URL', 'TG_CONTROL_CHAT_ID',
          'TG_AUTHORIZED_USER_IDS', 'TG_LOG_CHAT_ID', 'TG_LOG_TOPIC_ID'])
  }

  const shouldPrompt = (field: string): boolean => {
    if (!options.update || !updateWhat) return true
    return updateWhat.has(field)
  }

  const getExisting = (key: string): string | undefined => {
    const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'))
    return match?.[1]?.trim()
  }

  // Log streaming
  if (shouldPrompt('TG_LOG_CHAT_ID')) {
    const enableLogStreaming = await confirm({
      message: 'Enable log streaming to Telegram?',
      default: !!getExisting('TG_LOG_CHAT_ID'),
    })

    if (enableLogStreaming) {
      cliLogger.info('\n💡 To get chat IDs:')
      cliLogger.info('   1. Add bot to a group')
      cliLogger.info('   2. Send a message')
      cliLogger.info('   3. Use auto-configure to detect the ID\n')

      config.TG_LOG_CHAT_ID = await input({
        message: 'Enter log chat ID:',
        default: getExisting('TG_LOG_CHAT_ID'),
        validate: validateChatId,
      })

      if (config.TG_LOG_CHAT_ID && config.TG_LOG_CHAT_ID.trim().length > 0) {
        const useTopic = await confirm({
          message: 'Use a topic for logs?',
          default: !!getExisting('TG_LOG_TOPIC_ID'),
        })

        if (useTopic) {
          const topicId = await input({
            message: 'Enter topic ID:',
            default: getExisting('TG_LOG_TOPIC_ID'),
            validate: validateTopicId,
          })
          config.TG_LOG_TOPIC_ID = parseInt(topicId, 10)
        }
      }
    }
  }

  // Control commands
  if (shouldPrompt('TG_CONTROL_CHAT_ID')) {
    const existingControl = getExisting('TG_CONTROL_CHAT_ID')
    const enableControl = await confirm({
      message: 'Enable control commands (/stop, /restart, etc.)?',
      default: !!existingControl,
    })

    if (enableControl) {
      config.TG_CONTROL_CHAT_ID = await input({
        message: 'Enter control chat ID:',
        default: existingControl,
        validate: validateChatId,
      })

      if (config.TG_CONTROL_CHAT_ID && config.TG_CONTROL_CHAT_ID.trim().length > 0) {
        const useTopic = await confirm({
          message: 'Use a topic for control messages?',
          default: !!getExisting('TG_CONTROL_TOPIC_ID'),
        })

        if (useTopic) {
          const topicId = await input({
            message: 'Enter topic ID:',
            default: getExisting('TG_CONTROL_TOPIC_ID'),
            validate: validateTopicId,
          })
          config.TG_CONTROL_TOPIC_ID = parseInt(topicId, 10)
        }
      }

      // Authorized users
      config.TG_AUTHORIZED_USER_IDS = await input({
        message: 'Enter authorized user IDs (comma-separated):',
        default: getExisting('TG_AUTHORIZED_USER_IDS'),
        validate: validateUserIds,
      })
    }
  }

  return config as SetupConfig
}

/**
 * Validate token silently (no output)
 */
async function validateTokenSilently(token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const data = await response.json() as { ok: boolean }
    return data.ok
  } catch {
    return false
  }
}

/**
 * Validate token and show result
 */
async function validateToken(token: string): Promise<void> {
  cliLogger.info('\nValidating bot token...')

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const data = (await response.json()) as { ok: boolean; result?: { username: string; first_name: string } }

    if (data.ok && data.result) {
      cliLogger.success(`Bot connected: @${data.result.username} (${data.result.first_name})`)
    } else {
      cliLogger.warn('Could not validate token')
    }
  } catch {
    cliLogger.warn('Could not reach Telegram API')
  }
}

/**
 * Update env file with config
 */
function updateEnvFile(content: string, config: SetupConfig, updateMode = false): string {
  const lines = content.split('\n')
  const updated: string[] = []

  for (const line of lines) {
    if (line.trim().length === 0 || line.trim().startsWith('#')) {
      updated.push(line)
      continue
    }

    const [key] = line.split('=')

    if (!key) {
      updated.push(line)
      continue
    }

    const value = getConfigValue(config, key)
    if (value !== undefined) {
      updated.push(`${key}=${value}`)
    } else if (!updateMode) {
      updated.push(line)
    } else {
      updated.push(line)
    }
  }

  return updated.join('\n')
}

function getConfigValue(config: SetupConfig, key: string): string | undefined {
  const value = config[key as keyof SetupConfig]

  if (value === undefined || value === null) {
    return undefined
  }

  return String(value)
}

/**
 * Update a single env variable
 */
function updateEnvVar(content: string, key: string, value: string): string {
  const exists = new RegExp(`^${key}=(.+)$`, 'm').test(content)

  if (exists) {
    return content.replace(new RegExp(`^${key}=(.+)$`, 'm'), `${key}=${value}`)
  }

  const commentedMatch = content.match(new RegExp(`^#\\s*${key}=(.+)$`, 'm'))
  if (commentedMatch) {
    return content.replace(new RegExp(`^#\\s*${key}=(.+)$`, 'm'), `${key}=${value}`)
  }

  return content.trimEnd() + `\n${key}=${value}\n`
}

// ============================================================================
// FASE 4: Validators
// ============================================================================

/**
 * Validate bot token format
 */
function validateBotToken(token: string): true | string {
  if (!token || token.trim().length === 0) {
    return 'Token is required'
  }

  if (!token.includes(':')) {
    return 'Invalid format. Token must be: ID:HASH (e.g., 123456:ABC-DEF1234...)'
  }

  const parts = token.split(':')
  if (parts.length !== 2) {
    return 'Invalid format. Token must be: ID:HASH (e.g., 123456:ABC-DEF1234...)'
  }

  const [id, hash] = parts

  if (!id) {
    return 'Token ID missing. Make sure you copied the complete token'
  }

  if (!hash) {
    return 'Token hash missing. Make sure you copied the complete token'
  }

  const idNum = parseInt(id, 10)
  if (isNaN(idNum) || idNum < 100000) {
    return 'Invalid token ID. Must be a number >= 100000'
  }

  if (hash.length < 35) {
    return 'Token hash too short. Make sure you copied the complete token'
  }

  return true
}

/**
 * Validate chat ID (must be negative for supergroups)
 */
function validateChatId(chatId: string): true | string {
  if (!chatId || chatId.trim().length === 0) {
    return 'Chat ID is required'
  }

  const id = parseInt(chatId, 10)
  if (isNaN(id)) {
    return 'Chat ID must be a number'
  }

  if (id > 0) {
    return 'Chat IDs for groups are negative (e.g., -1001234567890)'
  }

  if (!chatId.startsWith('-100')) {
    return 'Supergroup chat IDs start with -100 (e.g., -1001234567890)'
  }

  return true
}

/**
 * Validate topic ID (must be positive)
 */
function validateTopicId(topicId: string): true | string {
  if (!topicId || topicId.trim().length === 0) {
    return 'Topic ID is required'
  }

  const id = parseInt(topicId, 10)
  if (isNaN(id)) {
    return 'Topic ID must be a number'
  }

  if (id <= 0) {
    return 'Topic IDs must be positive'
  }

  return true
}

/**
 * Validate user IDs (comma-separated)
 */
function validateUserIds(userIds: string): true | string {
  if (!userIds || userIds.trim().length === 0) {
    return 'At least one user ID is required'
  }

  const ids = userIds.split(',').map(id => id.trim())
  for (const id of ids) {
    const num = parseInt(id, 10)
    if (isNaN(num)) {
      return `Invalid user ID: "${id}". Must be a number`
    }
  }

  return true
}

// ============================================================================
// FASE 4: Pre-checks
// ============================================================================

/**
 * Pre-check results
 */
interface PreCheckResult {
  canProceed: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Run pre-checks before operations
 */
async function runPreChecks(
  envFile: string,
  environment: 'local' | 'staging' | 'production',
  mode: SetupMode
): Promise<PreCheckResult> {
  const result: PreCheckResult = {
    canProceed: true,
    errors: [],
    warnings: [],
  }

  // Read env file
  const envContent = existsSync(envFile) ? await readFile(envFile, 'utf-8') : ''

  // Extract values
  const tokenMatch = envContent.match(/^TG_BOT_TOKEN=(.+)$/m)
  const chatIdMatch = envContent.match(/^TG_CONTROL_CHAT_ID=(.+)$/m)
  const topicMatch = envContent.match(/^TG_CONTROL_TOPIC_ID=(.+)$/m)

  const token = tokenMatch?.[1]?.trim()
  const chatId = chatIdMatch?.[1]?.trim()
  const topicId = topicMatch?.[1]?.trim()

  // Check 1: Token validation for modes that need it
  if (mode === 'new-bot' || mode === 'add-ids' || mode === 'create-topics' || mode === 'manual') {
    if (!token) {
      result.errors.push('Bot token not found. Please configure TG_BOT_TOKEN first.')
      result.canProceed = false
    } else {
      const tokenValidation = validateBotToken(token)
      if (tokenValidation !== true) {
        result.errors.push(`Invalid bot token: ${tokenValidation}`)
        result.canProceed = false
      } else {
        // Validate with API
        const isValid = await validateTokenSilently(token)
        if (!isValid) {
          result.errors.push('Bot token is invalid or expired. Please check with @BotFather')
          result.canProceed = false
        }
      }
    }
  }

  // Check 2: Chat ID validation for modes that need it
  if (mode === 'add-ids' || mode === 'create-topics' || mode === 'manual') {
    if (!chatId) {
      result.warnings.push('Control chat ID not configured. You need to add the bot to a group first.')
    } else {
      const chatIdValidation = validateChatId(chatId)
      if (chatIdValidation !== true) {
        result.warnings.push(`Control chat ID issue: ${chatIdValidation}`)
      }
    }
  }

  // Check 3: Topic ID validation for create-topics mode
  if (mode === 'create-topics') {
    if (topicId) {
      result.warnings.push('Topics already created. Re-running will create new topics.')
    }
  }

  // Check 4: Bootstrap mode has special requirements
  if (mode === 'bootstrap') {
    if (!envContent) {
      result.warnings.push('Environment file will be created by bootstrap command')
    }
  }

  return result
}

/**
 * Display pre-check results
 */
function displayPreChecks(result: PreCheckResult): void {
  console.log('')

  if (result.errors.length > 0) {
    cliLogger.error('Pre-check Errors:')
    result.errors.forEach(error => console.log(`  ${chalk.red('✗')} ${error}`))
    console.log('')
  }

  if (result.warnings.length > 0) {
    cliLogger.warn('Pre-check Warnings:')
    result.warnings.forEach(warning => console.log(`  ${chalk.yellow('⚠')} ${warning}`))
    console.log('')
  }

  if (result.canProceed && result.errors.length === 0) {
    cliLogger.success('All pre-checks passed')
    console.log('')
  }
}

// ============================================================================
// FASE 5: DX Improvements
// ============================================================================

/**
 * Changes summary for tracking what was done
 */
interface ChangesSummary {
  created: string[]
  updated: string[]
  skipped: string[]
}

/**
 * Track changes during setup
 */
class SetupTracker {
  private changes: ChangesSummary = {
    created: [],
    updated: [],
    skipped: [],
  }

  created(item: string): void {
    this.changes.created.push(item)
  }

  updated(item: string): void {
    this.changes.updated.push(item)
  }

  skipped(item: string): void {
    this.changes.skipped.push(item)
  }

  show(): void {
    console.log('')
    cliLogger.title('📊 Changes Summary')

    if (this.changes.created.length > 0) {
      console.log(chalk.green('Created:'))
      this.changes.created.forEach(item => console.log(`  ${chalk.green('+')} ${item}`))
    }

    if (this.changes.updated.length > 0) {
      console.log(chalk.yellow('Updated:'))
      this.changes.updated.forEach(item => console.log(`  ${chalk.yellow('~')} ${item}`))
    }

    if (this.changes.skipped.length > 0) {
      console.log(chalk.dim('Skipped:'))
      this.changes.skipped.forEach(item => console.log(`  ${chalk.dim('-')} ${item}`))
    }

    if (this.changes.created.length === 0 && this.changes.updated.length === 0) {
      console.log(chalk.dim('No changes made'))
    }

    console.log('')
  }
}

/**
 * Show final summary with next steps
 */
function showFinalSummary(mode: SetupMode, environment: string): void {
  console.log('')
  cliLogger.title('✅ Setup Complete')

  const steps = {
    'new-bot': [
      `1. Add the bot to a group: ${chalk.cyan('https://t.me/your_bot')}`,
      `2. Make the bot admin in the group`,
      `3. Run: ${chalk.yellow('bun run dev')}`,
      `4. Send /start to your bot`,
    ],
    'add-ids': [
      `1. Review detected IDs in core/.env.${environment}`,
      `2. Run: ${chalk.yellow('bun run dev')}`,
      `3. Test the control commands`,
    ],
    'create-topics': [
      `1. Verify topics were created in your group`,
      `2. Topic IDs are saved in core/.env.${environment}`,
      `3. Run: ${chalk.yellow('bun run dev')}`,
    ],
    'bootstrap': [
      `1. Review the configuration in core/.env.${environment}`,
      `2. Your bot is ready to use`,
      `3. Run: ${chalk.yellow('bun run dev')}`,
    ],
    'manual': [
      `1. Review configuration in core/.env.${environment}`,
      `2. Run: ${chalk.yellow('bun run dev')}`,
      `3. Send /start to your bot`,
    ],
  }

  console.log('')
  console.log(chalk.bold('Next Steps:'))
  steps[mode]?.forEach(step => console.log(`  ${step}`))
  console.log('')
}
