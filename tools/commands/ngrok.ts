import { Command } from 'commander'
import { config as loadEnv } from 'dotenv'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { existsSync } from 'fs'
import chalk from 'chalk'
import type { BotCommand } from './index.js'

// Simple logger for CLI (independent of bot's logger)
const cliLogger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  error: (msg: string) => console.error(chalk.red('✗'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
}

interface NgrokCommand extends BotCommand {
  name: 'ngrok'
  description: string
  register: (program: Command) => void
}

const command: NgrokCommand = {
  name: 'ngrok',
  description: 'Start ngrok tunnel for webhook testing',

  register(program: Command) {
    program
      .command('ngrok')
      .description('Start ngrok tunnel for webhook testing')
      .option('-p, --port <port>', 'Port to forward (default: 3000)', '3000')
      .option('-e, --environment <env>', 'Environment (local|staging|production)', 'local')
      .option('-w, --webhook-url', 'Auto-update webhook URL in .env', false)
      .option('-s, --start-bot', 'Auto-start bot after ngrok', false)
      .option('-f, --force', 'Force start even if conflict detected', false)
      .action(async (options) => {
        await handleNgrok(options)
      })
  },
}

export default command

async function handleNgrok(options: {
  port: string
  environment: string
  webhookUrl: boolean
  startBot: boolean
  force: boolean
}): Promise<void> {
  const env = options.environment || 'local'

  // Determine environment file path
  const envPath = resolve(`./core/.env.${env}`)

  // Check if environment file exists
  if (!existsSync(envPath)) {
    cliLogger.error(`Environment file not found: ${chalk.cyan(envPath)}`)
    cliLogger.info(`Create it first or use ${chalk.yellow('--environment local')}`)
    process.exit(1)
  }

  // Load environment file
  loadEnv({ path: envPath })

  cliLogger.info(`Starting ngrok for ${chalk.cyan(env)}`)

  // Check instance conflicts if not forced
  if (!options.force) {
    const lockFiles = await discoverLockFiles()
    const conflictingInstance = lockFiles.find((lockFile) => {
      const instanceEnv = lockFile.split('/').pop()?.replace('.lock', '').replace('mks-bot-', '') || ''
      return instanceEnv === env
    })

    if (conflictingInstance) {
      cliLogger.warn(`Possible instance conflict detected for ${chalk.cyan(env)}`)
      cliLogger.info(`Use ${chalk.yellow('--force')} to start anyway`)
    }
  }

  // Check ngrok installation
  const ngrokCheck = Bun.spawn(['ngrok', 'version'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const ngrokVersion = await ngrokCheck.exited
  if (ngrokVersion !== 0) {
    cliLogger.error('ngrok not found. Install from https://ngrok.com/download')
    process.exit(1)
  }

  cliLogger.info(`Starting ngrok tunnel for port ${options.port}`)

  const ngrokProcess = Bun.spawn(['ngrok', 'http', options.port], {
    stdout: 'inherit',
    stderr: 'inherit',
  })

  // Wait a bit for ngrok to start and get the URL
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Try to get the tunnel URL from ngrok API
  const tunnelUrl = await getNgrokTunnelUrl()

  if (tunnelUrl) {
    cliLogger.success(`Tunnel: ${chalk.underline(tunnelUrl)}`)

    // Auto-update webhook URL if requested
    if (options.webhookUrl) {
      await updateEnvFile(envPath, {
        TG_WEBHOOK_URL: tunnelUrl,
        TG_MODE: 'webhook',
        TG_NGROK_ENABLED: 'true',
      })
      cliLogger.success(`Updated ${chalk.cyan(envPath)}`)
    }
  } else {
    cliLogger.warn('Could not detect tunnel URL. Check ngrok output above.')
  }

  if (options.startBot) {
    cliLogger.info('Starting bot...')

    const botProcess = Bun.spawn(['bun', 'run', 'start'], {
      cwd: resolve('.'),
      stdout: 'inherit',
      stderr: 'inherit',
      env: {
        ...process.env,
        TG_ENV: env,
      },
    })

    process.on('SIGINT', () => {
      cliLogger.warn('Shutting down...')
      ngrokProcess.kill()
      botProcess.kill()
      process.exit(0)
    })
  } else {
    process.on('SIGINT', () => {
      cliLogger.warn('Stopping ngrok...')
      ngrokProcess.kill()
      process.exit(0)
    })
  }

  await ngrokProcess.exited
}

async function discoverLockFiles(): Promise<string[]> {
  const { glob } = await import('glob')
  try {
    return await glob('core/tmp/*.lock', { absolute: true })
  } catch {
    return []
  }
}

interface NgrokApiTunnel {
  public_url: string
  proto: string
  name: string
}

interface NgrokApiResponse {
  tunnels: NgrokApiTunnel[]
  uri: string
}

async function getNgrokTunnelUrl(): Promise<string | null> {
  try {
    const response = await fetch('http://127.0.0.1:4040/api/tunnels')
    if (!response.ok) {
      return null
    }
    const data = (await response.json()) as NgrokApiResponse
    // eslint-disable-next-line ts/no-unnecessary-condition -- Runtime check
    if (data.tunnels && data.tunnels.length > 0) {
      return data.tunnels[0]?.public_url ?? null
    }
  } catch {
    return null
  }
  return null
}

async function updateEnvFile(
  path: string,
  updates: Record<string, string>
): Promise<void> {
  const content = await readFile(path, 'utf-8')
  const lines = content.split('\n')

  const updated = lines.map((line) => {
    for (const [key, value] of Object.entries(updates)) {
      if (line.startsWith(`${key}=`)) {
        return `${key}=${value}`
      }
    }
    return line
  })

  await writeFile(path, updated.join('\n'))
}
