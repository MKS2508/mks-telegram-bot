import type { Context, Middleware } from 'telegraf'
import { getLogTopicIds, getControlTopicIds } from '../config/index.js'
import { botLogger, badge, kv, colors, colorText } from './logging.js'

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
      botLogger.debug(
        `${badge('TOPIC', 'rounded')} ${kv({
          action: colorText('rejected', colors.warning),
          chat: chatId ?? 'unknown',
          topic: topicId ?? 'none',
          type: ctx.chat?.type ?? 'unknown',
        })}`
      )
      return
    }

    if (topicId && (logIds || controlIds)) {
      botLogger.debug(
        `${badge('TOPIC', 'rounded')} ${kv({
          action: colorText('accepted', colors.success),
          chat: chatId ?? 'unknown',
          topic: topicId,
        })}`
      )
    }

    return next()
  }
}
