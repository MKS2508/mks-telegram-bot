import type { Context, Middleware } from 'telegraf'
import type { Result, BotError } from './result.js'
import { commandLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
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
    const userId = ctx.from?.id ?? 'unknown'
    const username = ctx.from?.username ?? 'no-username'

    commandLogger.info(
      `${badge('CMD', 'rounded')} ${kv({
        cmd: colorText(`/${config.name}`, colors.command),
        user: colorText(String(userId), colors.user),
        username: colorText(`@${username}`, colors.dim),
      })}`
    )

    const args = extractArgs(ctx)

    const result = await config.handler(ctx, args)

    if (!result.ok) {
      commandLogger.error(
        `${badge('FAIL', 'rounded')} ${kv({
          cmd: `/${config.name}`,
          user: userId,
          error: result.error.message,
        })}`
      )
      await ctx.reply(`❌ ${result.error.message}`)
      return
    }

    commandLogger.success(
      `${badge('OK', 'rounded')} ${kv({
        cmd: `/${config.name}`,
        user: userId,
      })}`
    )

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
