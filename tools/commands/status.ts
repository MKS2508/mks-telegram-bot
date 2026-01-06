import { Command } from 'commander'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { glob } from 'glob'
import chalk from 'chalk'
import type { BotCommand } from './index.js'

const cliLogger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  error: (msg: string) => console.error(chalk.red('✗'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
}

interface StatusCommand extends BotCommand {
  name: 'status'
  description: string
  register: (program: Command) => void
}

interface InstanceInfo {
  pid: number
  instanceId: string
  environment: string
  instanceName: string
  startTime: string
  nodeVersion: string
  cwd: string
  running: boolean
  uptime: string
}

const command: StatusCommand = {
  name: 'status',
  description: 'Show running bot instances',

  register(program: Command) {
    program
      .command('status')
      .description('Show all running bot instances')
      .option('-j, --json', 'Output as JSON')
      .action(async (options) => {
        await handleStatus(options)
      })
  },
}

export default command

async function handleStatus(options: { json?: boolean }): Promise<void> {
  const instances = await discoverInstances()

  if (instances.length === 0) {
    cliLogger.warn('No instances found')
    return
  }

  if (options.json) {
    console.log(JSON.stringify(instances, null, 2))
  } else {
    displayInstancesTable(instances)
  }
}

async function discoverInstances(): Promise<InstanceInfo[]> {
  const instances: InstanceInfo[] = []

  try {
    const lockFiles = await glob('core/tmp/*.lock', { absolute: false })

    // Sequential file loading is intentional for error handling
    /* oxlint-disable no-await-in-loop */
    for (const lockFile of lockFiles) {
      try {
        if (!existsSync(lockFile)) {
          continue
        }

        const content = await readFile(lockFile, 'utf-8')
        const lockData = JSON.parse(content)

        instances.push({
          ...lockData,
          running: isProcessRunning(lockData.pid),
          uptime: calculateUptime(lockData.startTime),
        })
      } catch {
        // Skip invalid lock files
        // oxlint-disable-next-line no-console -- Intentional logging
        cliLogger.warn(`Failed to read ${lockFile}`)
      }
    }
    /* oxlint-enable no-await-in-loop */
  } catch {
    cliLogger.error('Failed to scan for instances')
  }

  return instances
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function calculateUptime(startTime: string): string {
  const start = new Date(startTime)
  const now = new Date()
  const diff = now.getTime() - start.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function displayInstancesTable(instances: InstanceInfo[]): void {
  const tableData = instances.map((i) => ({
    PID: i.pid.toString(),
    Environment: i.environment,
    Name: i.instanceName,
    Status: i.running
      ? chalk.green('✓ Running')
      : chalk.red('✗ Stopped'),
    Uptime: i.uptime,
  }))

  console.log('')
  console.table(tableData)
  console.log('')
}
