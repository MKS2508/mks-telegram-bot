import { Command } from 'commander'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import { input, confirm } from '@inquirer/prompts'
import ora from 'ora'
import type { BotCommand } from './index.js'
import {
  BootstrapClient,
  BotFatherManager,
  GroupManager,
  TopicManager,
  type CreateSupergroupOptions,
} from '../../packages/bootstrapper/src/index.js'

const cliLogger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  error: (msg: string) => console.error(chalk.red('✗'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  title: (msg: string) => console.log(chalk.cyan.bold('\n' + msg + '\n')),
}

interface BootstrapCommand extends BotCommand {
  name: 'bootstrap'
  description: string
  register: (program: Command) => void
}

interface BootstrapOptions {
  environment?: 'local' | 'staging' | 'production'
  botName?: string
  botUsername?: string
  groupName?: string
  skipTopics?: boolean
}

const command: BootstrapCommand = {
  name: 'bootstrap',
  description: 'Full bootstrap: Create bot, group, and topics',

  register(program: Command) {
    program
      .command('bootstrap')
      .description('Complete bootstrap: Create bot, group, topics, and configure .env')
      .option('-e, --environment <local|staging|production>', 'Target environment', 'local')
      .option('--bot-name <value>', 'Bot display name')
      .option('--bot-username <value>', 'Bot username (must end in "bot")')
      .option('--group-name <value>', 'Group/forum title')
      .option('--skip-topics', 'Skip creating topics', false)
      .action(async (options) => {
        await handleBootstrap(options)
      })
  },
}

export default command

interface BootstrapResult {
  botToken?: string
  botUsername?: string
  chatId?: number
  controlTopicId?: number
  logTopicId?: number
  configTopicId?: number
  bugsTopicId?: number
  generalTopicId?: number
}

async function handleBootstrap(options: BootstrapOptions): Promise<void> {
  cliLogger.title('🚀 Complete Bot Bootstrap')

  const environment = options.environment ?? 'local'
  const envFile = resolve(process.cwd(), 'core', `.env.${environment}`)

  // Verify .env file exists
  if (!existsSync(envFile)) {
    cliLogger.error(`Environment file not found: ${envFile}`)
    cliLogger.info('Please run "bun run setup" first to create the environment file.')
    return
  }

  // Load env file to check for existing API credentials
  const envContent = await readFile(envFile, 'utf-8')
  const apiIdMatch = envContent.match(/^TG_API_ID=(.+)$/m)
  const apiHashMatch = envContent.match(/^TG_API_HASH=(.+)$/m)

  const envApiId = apiIdMatch?.[1]?.trim()
  const envApiHash = apiHashMatch?.[1]?.trim()
  const hasEnvCredentials = !!envApiId && !!envApiHash

  // Get API credentials (from env or prompt)
  const apiCredentials = await getApiCredentials(hasEnvCredentials, envApiId, envApiHash)
  if (!apiCredentials) {
    cliLogger.error('Failed to get API credentials')
    return
  }

  const spinner = ora({ color: 'cyan' })

  try {
    // Step 1: Initialize BootstrapClient
    spinner.text = 'Initializing Telegram client...'
    spinner.start()

    const client = new BootstrapClient({
      apiId: apiCredentials.apiId,
      apiHash: apiCredentials.apiHash,
    })

    // Save API credentials to env if requested
    if (apiCredentials.saveToEnv) {
      spinner.text = 'Saving API credentials to .env...'
      const envContent = await readFile(envFile, 'utf-8')
      let updatedContent = envContent

      // Add or update API credentials
      updatedContent = updateEnvVar(updatedContent, 'TG_API_ID', String(apiCredentials.apiId))
      updatedContent = updateEnvVar(updatedContent, 'TG_API_HASH', apiCredentials.apiHash)

      await writeFile(envFile, updatedContent, 'utf-8')
      spinner.succeed('API credentials saved to .env')
    }

    // Ensure authorized (may prompt for phone/code/2FA)
    // Note: This step is interactive and will show its own prompts
    const isAuthorized = await client.ensureAuthorized()
    if (!isAuthorized) {
      cliLogger.error('Authorization failed')
      return
    }

    cliLogger.success('Connected to Telegram')

    // Get bot info
    const botName = options.botName ?? await input({ message: 'Enter bot display name:' })
    let botUsername = options.botUsername
    if (!botUsername) {
      botUsername = await input({
        message: 'Enter bot username (must end in "bot"):',
        validate: (value: string) => {
          if (!value.endsWith('bot')) {
            return 'Username must end with "bot"'
          }
          return true
        },
      })
    }

    // Step 2: Create bot via BotFather
    cliLogger.title('🤖 Step 1: Creating Bot')
    spinner.text = 'Creating bot via @BotFather...'
    spinner.start()

    const botFather = new BotFatherManager(client)
    const botResult = await botFather.createBot({
      botName,
      botUsername: botUsername!,
    })

    if (!botResult.success || !botResult.botToken) {
      spinner.fail('Failed to create bot')
      if (botResult.error) {
        cliLogger.error(botResult.error)
      }
      return
    }

    spinner.succeed(`Bot created: @${botResult.botUsername}`)

    // Step 3: Create supergroup/forum
    const groupName = options.groupName ?? await input({
      message: 'Enter group/forum title:',
      default: `${botName} Control`,
    })

    cliLogger.title('💬 Step 2: Creating Group/Forum')
    spinner.text = 'Creating supergroup with forum mode...'
    spinner.start()

    const groupManager = new GroupManager(client)
    const groupResult = await groupManager.createSupergroup({
      title: groupName,
      forumMode: true,
    })

    if (!groupResult.success || !groupResult.chatId) {
      spinner.fail('Failed to create group')
      if (groupResult.error) {
        cliLogger.error(groupResult.error)
      }
      return
    }

    spinner.succeed(`Group created: ${groupName} (ID: ${groupResult.chatId})`)

    // Step 4: Add bot as admin
    spinner.text = 'Adding bot as admin...'
    spinner.start()

    await sleep(2000) // Wait for group to be ready

    const adminResult = await groupManager.addBotAsAdmin(
      groupResult.chatId,
      botResult.botUsername!,
      {
        canManageTopics: true,
        canDeleteMessages: true,
        canEditMessages: false,
        canInviteUsers: true,
      }
    )

    if (!adminResult.success) {
      spinner.warn('Failed to add bot as admin (you may need to do this manually)')
      cliLogger.warn(`Please add @${botResult.botUsername} as admin in the group`)
    } else {
      spinner.succeed('Bot added as admin')
    }

    // Step 5: Create topics
    const bootstrapResult: BootstrapResult = {
      botToken: botResult.botToken,
      botUsername: botResult.botUsername,
      chatId: groupResult.chatId,
    }

    if (!options.skipTopics) {
      cliLogger.title('🧵 Step 3: Creating Topics')

      const topicManager = new TopicManager(botResult.botToken)
      const topicNames = ['General', 'Control', 'Logs', 'Config', 'Bugs']

      spinner.text = 'Creating forum topics...'
      spinner.start()

      const topicResults = await topicManager.createTopics(groupResult.chatId, topicNames)

      spinner.succeed(`Created ${topicResults.length} topics`)

      for (const { name, result } of topicResults) {
        if (result.success && result.threadId) {
          console.log(`  ${chalk.cyan(name)}: ${chalk.yellow(String(result.threadId))}`)

          // Map topics to result
          switch (name.toLowerCase()) {
            case 'control':
              bootstrapResult.controlTopicId = result.threadId
              break
            case 'logs':
            case 'log':
              bootstrapResult.logTopicId = result.threadId
              break
            case 'config':
              bootstrapResult.configTopicId = result.threadId
              break
            case 'bugs':
              bootstrapResult.bugsTopicId = result.threadId
              break
            case 'general':
              bootstrapResult.generalTopicId = result.threadId
              break
          }
        }
      }
    }

    // Step 6: Update .env file
    cliLogger.title('🔧 Step 4: Updating Configuration')
    spinner.text = 'Updating .env file...'
    spinner.start()

    await updateEnvFile(envFile, bootstrapResult)

    spinner.succeed(`Updated ${envFile}`)

    // Summary
    cliLogger.title('✅ Bootstrap Complete')
    console.log('')
    console.log(chalk.bold('Bot Information:'))
    console.log(`  Username: ${chalk.green('@' + bootstrapResult.botUsername)}`)
    console.log(`  Token: ${chalk.yellow(bootstrapResult.botToken?.slice(0, 10) + '...')}`)
    console.log('')
    console.log(chalk.bold('Group Information:'))
    console.log(`  Name: ${chalk.cyan(groupName)}`)
    console.log(`  Chat ID: ${chalk.yellow(String(bootstrapResult.chatId))}`)
    console.log('')
    console.log(chalk.bold('Topic IDs:'))
    if (bootstrapResult.generalTopicId) console.log(`  General: ${chalk.yellow(String(bootstrapResult.generalTopicId))}`)
    if (bootstrapResult.controlTopicId) console.log(`  Control: ${chalk.yellow(String(bootstrapResult.controlTopicId))}`)
    if (bootstrapResult.logTopicId) console.log(`  Logs: ${chalk.yellow(String(bootstrapResult.logTopicId))}`)
    if (bootstrapResult.configTopicId) console.log(`  Config: ${chalk.yellow(String(bootstrapResult.configTopicId))}`)
    if (bootstrapResult.bugsTopicId) console.log(`  Bugs: ${chalk.yellow(String(bootstrapResult.bugsTopicId))}`)
    console.log('')
    cliLogger.success('Your bot is now ready to use!')
    console.log('')
    cliLogger.info('Next steps:')
    console.log(`  ${chalk.dim('1.')} Review the configuration in ${chalk.cyan(`core/.env.${environment}`)}`)
    console.log(`  ${chalk.dim('2.')} Run: ${chalk.cyan('bun run dev')}`)
    console.log(`  ${chalk.dim('3.')} Send /start to your bot in Telegram`)
    console.log('')

    // Cleanup
    await client.disconnect()
  } catch (error) {
    spinner.stop()
    cliLogger.error('Bootstrap failed')
    if (error instanceof Error) {
      console.error(chalk.dim(`  ${error.message}`))
    }
  }
}

/**
 * Get API credentials from user
 * @param fromEnv - If credentials come from environment variables
 * @param envApiId - API ID from environment (if available)
 * @param envApiHash - API Hash from environment (if available)
 */
async function getApiCredentials(
  fromEnv: boolean,
  envApiId?: string,
  envApiHash?: string
): Promise<{ apiId: number; apiHash: string; saveToEnv: boolean } | null> {
  // If credentials are in environment, use them directly
  if (fromEnv && envApiId && envApiHash) {
    const apiId = parseInt(envApiId, 10)
    if (isNaN(apiId)) {
      cliLogger.error('Invalid TG_API_ID in environment file. Must be a number.')
      return null
    }
    return { apiId, apiHash: envApiHash, saveToEnv: false }
  }

  cliLogger.title('📱 Telegram MTProto API Credentials')

  console.log('')
  console.log(chalk.bold('To create bots and groups automatically, you need MTProto API credentials.'))
  console.log('')
  console.log(chalk.cyan('📋 STEP-BY-STEP GUIDE:'))
  console.log('')
  console.log(chalk.dim('1. Open https://my.telegram.org in your browser'))
  console.log(chalk.dim('2. Log in with your phone number (the same number you use in Telegram)'))
  console.log(chalk.dim('3. Click on "API development tools"'))
  console.log(chalk.dim('4. Fill in the form:'))
  console.log(chalk.dim('   - App title: My Bot App'))
  console.log(chalk.dim('   - Short name: mybotapp'))
  console.log(chalk.dim('   - Platform: Desktop or Web'))
  console.log(chalk.dim('   - Description: (optional)'))
  console.log(chalk.dim('5. Click "Create application"'))
  console.log(chalk.dim('6. Copy the api_id and api_hash from the next page'))
  console.log('')

  const useEnv = await confirm({
    message: 'Do you want to save API credentials to .env file for future use?',
    default: true,
  })

  console.log('')

  const apiId = await input({
    message: 'Enter your API ID:',
    validate: (value: string) => {
      const num = parseInt(value, 10)
      if (isNaN(num)) {
        return 'API ID must be a number'
      }
      if (num < 1) {
        return 'API ID must be positive'
      }
      return true
    },
  })

  const apiHash = await input({
    message: 'Enter your API Hash:',
    validate: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'API Hash is required'
      }
      if (value.trim().length < 32) {
        return 'API Hash seems too short (should be 32+ characters)'
      }
      return true
    },
  })

  console.log('')
  console.log(chalk.cyan('🔐 Next: TELEGRAM LOGIN'))
  console.log('')
  console.log(chalk.dim('After you enter your credentials, you will need to:'))
  console.log(chalk.dim('1. Enter your phone number (with country code, e.g., +34612345678)'))
  console.log(chalk.dim('2. Enter the verification code you receive via Telegram'))
  console.log(chalk.dim('3. Enter your 2FA password (if you have Cloud Password enabled)'))
  console.log(chalk.dim('4. Your session will be saved for future use'))
  console.log('')

  const proceed = await confirm({
    message: 'Ready to continue?',
    default: true,
  })

  if (!proceed) {
    return null
  }

  return {
    apiId: parseInt(apiId, 10),
    apiHash: apiHash.trim(),
    saveToEnv: useEnv,
  }
}

/**
 * Update .env file with bootstrap results
 */
async function updateEnvFile(envFile: string, result: BootstrapResult): Promise<void> {
  const envContent = await readFile(envFile, 'utf-8')
  let updatedContent = envContent

  // Update bot token
  if (result.botToken) {
    updatedContent = updateEnvVar(updatedContent, 'TG_BOT_TOKEN', result.botToken)
  }

  // Update control chat ID
  if (result.chatId) {
    updatedContent = updateEnvVar(updatedContent, 'TG_CONTROL_CHAT_ID', String(result.chatId))
  }

  // Update control topic ID
  if (result.controlTopicId) {
    updatedContent = updateEnvVar(updatedContent, 'TG_CONTROL_TOPIC_ID', String(result.controlTopicId))
  }

  // Update log topic ID
  if (result.logTopicId) {
    updatedContent = updateEnvVar(updatedContent, 'TG_LOG_TOPIC_ID', String(result.logTopicId))
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

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
