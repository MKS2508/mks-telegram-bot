import type { Context, Middleware } from 'telegraf'
import { botLogger } from './logging.js'

export function errorHandler<T extends Context>(): Middleware<T> {
  return async (ctx, next) => {
    try {
      return await next()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const errorMsg = err.message || 'Unknown error occurred'

      botLogger.error(`Error occurred: ${errorMsg}`, err)

      const message = `❌ *Error:*\n${errorMsg}`

      try {
        await ctx.reply(message, { parse_mode: 'Markdown' })
      } catch {
        botLogger.error('Failed to send error message to user')
      }
    }
  }
}
