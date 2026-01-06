import type { Context, Middleware } from 'telegraf'
import { getLogTopicIds, getControlTopicIds } from '../config/index.js'
import { botLogger } from './logging.js'

export function topicValidation(): Middleware<Context> {
  return async (ctx, next) => {
    const logIds = getLogTopicIds()
    const controlIds = getControlTopicIds()

    if (!logIds && !controlIds) {
      return next()
    }

    const chatId = ctx.chat?.id.toString()
    const topicId = ctx.message?.message_thread_id

    let isValid = false

    if (logIds && chatId === logIds.chatId) {
      if (!logIds.topicId || topicId === logIds.topicId) {
        isValid = true
      }
    }

    if (controlIds && chatId === controlIds.chatId) {
      if (!controlIds.topicId || topicId === controlIds.topicId) {
        isValid = true
      }
    }

    if (!isValid && ctx.chat?.type !== 'private' && (logIds || controlIds)) {
      botLogger.debug(`Message rejected from chat ${chatId}, topic ${topicId}`)
      return
    }

    return next()
  }
}
