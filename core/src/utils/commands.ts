import type { Context, Middleware } from 'telegraf'
import type { Result, BotError } from './result.js'
import { commandLogger } from '../middleware/logging.js'
import { botManager } from './bot-manager.js'

export interface CommandConfig {
  name: string
  description?: string
  auth?: boolean
  stats?: boolean
  handler: CommandHandler
}

export type CommandHandler = (ctx: Context, args: string[]) => Promise<Result<void, BotError>>

export function createCommandHandler(config: CommandConfig): Middleware<Context> {
  return async (ctx, next) => {
    commandLogger.info(`Command ${config.name} from user ${ctx.from?.id}`)

    const args = extractArgs(ctx)

    const result = await config.handler(ctx, args)

    if (!result.ok) {
      commandLogger.error(`Command ${config.name} failed: ${result.error.message}`)
      await ctx.reply(`❌ ${result.error.message}`)
      return
    }

    if (config.stats) {
      botManager.incrementCommands()
    }

    return next()
  }
}

function extractArgs(ctx: Context): string[] {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : ''
  return text.split(' ').filter(Boolean)
}
