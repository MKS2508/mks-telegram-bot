import type { Context, Middleware } from 'telegraf'
import { botManager } from '../utils/bot-manager.js'
import { botLogger } from './logging.js'

export function auth(): Middleware<Context> {
  return async (ctx, next) => {
    if (!ctx.from?.id) {
      botLogger.warn('Unauthorized access attempt: no user ID')
      return
    }

    const authResult = botManager.authorize(ctx.from.id)

    if (!authResult.ok) {
      botLogger.error(`Unauthorized access from user ${ctx.from.id}: ${authResult.error.message}`)
      await ctx.reply(`⛔ ${authResult.error.message}`)
      return
    }

    return next()
  }
}
