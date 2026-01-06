#!/usr/bin/env bun
import { Command } from 'commander'
import pkg from '../package.json' with { type: 'json' }
import { registerCommands } from './commands/index.js'

const program = new Command()

program
  .name('mks-bot')
  .description((pkg as { description?: string }).description ?? 'mks-telegram-bot CLI tools')
  .version((pkg as { version?: string }).version ?? '0.1.0')
  .configureHelp({ helpWidth: 80 })

await registerCommands(program)

program.parse()
