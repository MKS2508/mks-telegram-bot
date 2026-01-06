import { Command } from 'commander'
import { readdirSync } from 'fs'
import { join } from 'path'
import { URL, fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export interface BotCommand {
  name: string
  description: string
  register: (program: Command) => void
}

export async function registerCommands(program: Command): Promise<void> {
  const commandsDir = join(__dirname)

  const commandFiles = readdirSync(commandsDir).filter(
    (file) => file.endsWith('.ts') && file !== 'index.ts'
  )

  // Sequential command loading is intentional for order preservation
  /* oxlint-disable no-await-in-loop */
  for (const file of commandFiles) {
    try {
      const module = await import(`./${file}`)
      const command: BotCommand = module.default
      if (command?.register) {
        command.register(program)
      }
    } catch (error) {
      console.error(`Failed to load command from ${file}:`, error)
    }
  }
  /* oxlint-enable no-await-in-loop */
}
