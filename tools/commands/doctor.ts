import { Command } from 'commander'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import type { BotCommand } from './index.js'

const cliLogger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  error: (msg: string) => console.error(chalk.red('✗'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
}

interface DoctorCommand extends BotCommand {
  name: 'doctor'
  description: string
  register: (program: Command) => void
}

interface CheckResult {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  details?: string
}

const command: DoctorCommand = {
  name: 'doctor',
  description: 'Diagnose bot configuration and environment',

  register(program: Command) {
    program
      .command('doctor')
      .description('Run diagnostics on bot configuration')
      .action(async () => {
        await handleDoctor()
      })
  },
}

export default command

async function handleDoctor(): Promise<void> {
  console.log('')
  console.log(chalk.cyan.bold('mks-telegram-bot Diagnostics'))
  console.log('')

  const checks: CheckResult[] = []

  // Run all checks
  checks.push(await checkNodeVersion())
  checks.push(await checkBunVersion())
  checks.push(await checkDependencies())
  checks.push(await checkEnvFile())
  checks.push(await checkRequiredEnvVars())
  checks.push(await checkBotToken())
  checks.push(await checkControlCommands())
  checks.push(await checkTmpDirectory())
  checks.push(await checkLogsDirectory())
  checks.push(await checkPorts())
  checks.push(await checkGitIgnore())

  // Display results
  displayResults(checks)

  // Exit with appropriate code
  const failed = checks.filter((c) => c.status === 'fail')
  if (failed.length > 0) {
    process.exit(1)
  }
}

async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.version
  const versionParts = version.slice(1).split('.')
  const major = Number.parseInt(versionParts[0] ?? '0', 10)

  if (major >= 20) {
    return {
      name: 'Node.js version',
      status: 'pass',
      message: `Node.js ${version} (requires >= 20)`,
    }
  }

  return {
    name: 'Node.js version',
    status: 'fail',
    message: `Node.js ${version} (requires >= 20)`,
    details: 'Please upgrade Node.js to version 20 or later',
  }
}

async function checkBunVersion(): Promise<CheckResult> {
  try {
    const result = await Bun.spawn(['bun', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    }).exited

    if (result === 0) {
      return {
        name: 'Bun installation',
        status: 'pass',
        message: 'Bun is installed',
      }
    }

    return {
      name: 'Bun installation',
      status: 'fail',
      message: 'Bun not found',
      details: 'Install Bun from https://bun.sh',
    }
  } catch {
    return {
      name: 'Bun installation',
      status: 'fail',
      message: 'Bun not found',
      details: 'Install Bun from https://bun.sh',
    }
  }
}

async function checkDependencies(): Promise<CheckResult> {
  const packageJsonPath = join(process.cwd(), 'package.json')
  const lockPath = join(process.cwd(), 'bun.lock')

  if (!existsSync(packageJsonPath)) {
    return {
      name: 'Dependencies',
      status: 'fail',
      message: 'package.json not found',
      details: 'You are not in a valid project directory',
    }
  }

  if (!existsSync(lockPath)) {
    return {
      name: 'Dependencies',
      status: 'fail',
      message: 'Dependencies not installed',
      details: 'Run: bun install',
    }
  }

  const corePackagePath = join(process.cwd(), 'core', 'node_modules')

  if (!existsSync(corePackagePath)) {
    return {
      name: 'Dependencies',
      status: 'fail',
      message: 'Workspace dependencies not installed',
      details: 'Run: bun install',
    }
  }

  return {
    name: 'Dependencies',
    status: 'pass',
    message: 'All dependencies installed',
  }
}

async function checkEnvFile(): Promise<CheckResult> {
  const envFiles = ['.env.local', '.env.staging', '.env.production']
  const foundFiles: string[] = []

  for (const file of envFiles) {
    const path = join(process.cwd(), 'core', file)
    if (existsSync(path)) {
      foundFiles.push(file)
    }
  }

  if (foundFiles.length > 0) {
    return {
      name: 'Environment files',
      status: 'pass',
      message: `Found: ${foundFiles.join(', ')}`,
    }
  }

  return {
    name: 'Environment files',
    status: 'fail',
    message: 'No .env file found',
    details: 'Run: bun run setup',
  }
}

async function checkRequiredEnvVars(): Promise<CheckResult> {
  const envPath = join(process.cwd(), 'core', '.env.local')

  if (!existsSync(envPath)) {
    return {
      name: 'Environment variables',
      status: 'warn',
      message: 'No .env.local file to check',
      details: 'Run: bun run setup',
    }
  }

  try {
    const content = await readFile(envPath, 'utf-8')
    const missing: string[] = []

    // Check for required variables
    if (!content.includes('TG_BOT_TOKEN=') || content.includes('TG_BOT_TOKEN=123456:')) {
      missing.push('TG_BOT_TOKEN')
    }

    if (!content.includes('TG_MODE=')) {
      missing.push('TG_MODE')
    }

    if (missing.length === 0) {
      return {
        name: 'Environment variables',
        status: 'pass',
        message: 'Required variables set',
      }
    }

    return {
      name: 'Environment variables',
      status: 'fail',
      message: `Missing: ${missing.join(', ')}`,
      details: 'Edit core/.env.local or run: bun run setup',
    }
  } catch {
    return {
      name: 'Environment variables',
      status: 'warn',
      message: 'Could not read .env.local',
    }
  }
}

async function checkBotToken(): Promise<CheckResult> {
  const envPath = join(process.cwd(), 'core', '.env.local')

  if (!existsSync(envPath)) {
    return {
      name: 'Bot token validation',
      status: 'warn',
      message: 'No .env.local file found',
      details: 'Run: bun run setup',
    }
  }

  try {
    const content = await readFile(envPath, 'utf-8')
    const match = content.match(/TG_BOT_TOKEN=([^\n]+)/)

    if (!match || match[1] === '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11') {
      return {
        name: 'Bot token validation',
        status: 'fail',
        message: 'Invalid or placeholder bot token',
        details: 'Get a token from @BotFather and run: bun run setup',
      }
    }

    const token = (match[1] ?? '').trim()

    // Try to validate with Telegram API
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
        signal: AbortSignal.timeout(5000),
      })
      const data = (await response.json()) as { ok: boolean; description?: string }

      if (data.ok) {
        return {
          name: 'Bot token validation',
          status: 'pass',
          message: 'Bot token is valid',
        }
      }

      return {
        name: 'Bot token validation',
        status: 'fail',
        message: 'Invalid bot token',
        details: data.description ?? 'Token rejected by Telegram API',
      }
    } catch {
      return {
        name: 'Bot token validation',
        status: 'warn',
        message: 'Could not validate token (network error)',
        details: 'Check your internet connection',
      }
    }
  } catch {
    return {
      name: 'Bot token validation',
      status: 'warn',
      message: 'Could not read bot token',
    }
  }
}

async function checkControlCommands(): Promise<CheckResult> {
  const envPath = join(process.cwd(), 'core', '.env.local')

  if (!existsSync(envPath)) {
    return {
      name: 'Control commands',
      status: 'warn',
      message: 'No .env.local file found',
    }
  }

  try {
    const content = await readFile(envPath, 'utf-8')
    const hasControlChatId = content.includes('TG_CONTROL_CHAT_ID=') && !content.includes('TG_CONTROL_CHAT_ID=#')

    if (hasControlChatId) {
      const match = content.match(/TG_CONTROL_CHAT_ID=([^\n]+)/)
      const chatId = match?.[1]?.trim()

      if (!chatId || chatId === 'your_control_chat_id_here' || chatId.startsWith('#')) {
        return {
          name: 'Control commands',
          status: 'warn',
          message: 'Control chat ID not configured',
          details: 'Control commands (/stop, /restart) are disabled. Run: bun run setup',
        }
      }

      const hasAuthorizedUsers = content.includes('TG_AUTHORIZED_USER_IDS=')

      if (!hasAuthorizedUsers) {
        return {
          name: 'Control commands',
          status: 'warn',
          message: 'Control enabled but no authorized users',
          details: 'Add TG_AUTHORIZED_USER_IDS to .env.local',
        }
      }

      return {
        name: 'Control commands',
        status: 'pass',
        message: 'Control commands enabled',
      }
    }

    return {
      name: 'Control commands',
      status: 'warn',
      message: 'Control commands disabled',
      details: 'Enable with TG_CONTROL_CHAT_ID. Run: bun run setup',
    }
  } catch {
    return {
      name: 'Control commands',
      status: 'warn',
      message: 'Could not read .env.local',
    }
  }
}

async function checkTmpDirectory(): Promise<CheckResult> {
  const tmpPath = join(process.cwd(), 'core', 'tmp')

  if (!existsSync(tmpPath)) {
    return {
      name: 'Temp directory',
      status: 'warn',
      message: 'core/tmp does not exist',
      details: 'It will be created automatically when the bot starts',
    }
  }

  // Check if writable
  try {
    const testFile = join(tmpPath, `.write-test-${Date.now()}`)
    await Bun.write(testFile, 'test')
    await Bun.file(testFile).delete()
    return {
      name: 'Temp directory',
      status: 'pass',
      message: 'core/tmp is writable',
    }
  } catch {
    return {
      name: 'Temp directory',
      status: 'fail',
      message: 'core/tmp is not writable',
      details: 'Check permissions on core/tmp directory',
    }
  }
}

async function checkLogsDirectory(): Promise<CheckResult> {
  const logsPath = join(process.cwd(), 'core', 'logs')

  if (!existsSync(logsPath)) {
    return {
      name: 'Logs directory',
      status: 'warn',
      message: 'core/logs does not exist',
      details: 'It will be created automatically when needed',
    }
  }

  return {
    name: 'Logs directory',
    status: 'pass',
    message: 'core/logs exists',
  }
}

async function checkPorts(): Promise<CheckResult> {
  const port = 3000
  const server = Bun.serve({
    port,
    fetch: () => new Response('OK'),
  })

  const portInUse = server.port === port

  await server.stop(true)

  if (portInUse) {
    return {
      name: 'Port availability',
      status: 'pass',
      message: `Port ${port} is available`,
    }
  }

  return {
    name: 'Port availability',
    status: 'warn',
    message: `Port ${port} may be in use`,
    details: 'If you have issues, check for other processes using this port',
  }
}

async function checkGitIgnore(): Promise<CheckResult> {
  const gitIgnorePath = join(process.cwd(), '.gitignore')

  if (!existsSync(gitIgnorePath)) {
    return {
      name: 'Git ignore',
      status: 'warn',
      message: '.gitignore not found',
      details: 'Consider adding .gitignore to exclude .env files',
    }
  }

  try {
    const content = await readFile(gitIgnorePath, 'utf-8')
    const hasEnvIgnore = content.includes('.env') || content.includes('core/.env')

    if (hasEnvIgnore) {
      return {
        name: 'Git ignore',
        status: 'pass',
        message: '.env files are excluded from git',
      }
    }

    return {
      name: 'Git ignore',
      status: 'warn',
      message: '.env files may not be excluded from git',
      details: 'Add "*.env" or "core/.env*" to .gitignore',
    }
  } catch {
    return {
      name: 'Git ignore',
      status: 'warn',
      message: 'Could not read .gitignore',
    }
  }
}

function displayResults(checks: CheckResult[]): void {
  const passed = checks.filter((c) => c.status === 'pass')
  const warnings = checks.filter((c) => c.status === 'warn')
  const failed = checks.filter((c) => c.status === 'fail')

  // Display checks
  for (const check of checks) {
    const icon = check.status === 'pass' ? chalk.green('✓') : check.status === 'warn' ? chalk.yellow('⚠') : chalk.red('✗')
    const name = check.name.padEnd(30)

    console.log(`${icon} ${chalk.bold(name)} ${check.message}`)

    if (check.details) {
      console.log(`  ${chalk.dim(check.details)}`)
    }
  }

  // Summary
  console.log('')
  console.log(chalk.bold('Summary:'))
  console.log(`  ${chalk.green('✓')} Passed: ${passed.length}`)
  console.log(`  ${chalk.yellow('⚠')} Warnings: ${warnings.length}`)
  console.log(`  ${chalk.red('✗')} Failed: ${failed.length}`)
  console.log('')

  if (failed.length === 0) {
    cliLogger.success('All checks passed! Your bot is ready to run.')
    console.log('')
    console.log('Next steps:')
    console.log('  1. Run: bun run dev')
    console.log('  2. Send /start to your bot')
  } else {
    cliLogger.error('Some checks failed. Please fix the issues above.')
    console.log('')
    console.log('Common fixes:')
    console.log('  - Run: bun run setup')
    console.log('  - Run: bun install')
  }
}
