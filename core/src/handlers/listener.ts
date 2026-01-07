import type { Context } from 'telegraf'
import { success as logSuccess, error as logError } from '@mks2508/better-logger'

/**
 * Collected IDs from listener mode
 */
export interface CollectedIds {
  authorizedUserIds: Set<number>
  controlChatId: number | null
  controlTopicId: number | null
  logChatId: number | null
  logTopicId: number | null
  messagesCount: number
}

/**
 * Get thread ID from a message
 * Checks multiple possible locations where thread_id can be stored
 */
function getThreadId(msg: MaybeMessage): number | undefined {
  if (!msg) return undefined

  // Direct thread_id property (forum topics)
  if ('thread_id' in msg && typeof msg.thread_id === 'number') {
    return msg.thread_id
  }

  // message_thread_id (alternative property)
  if ('message_thread_id' in msg && typeof msg.message_thread_id === 'number') {
    return msg.message_thread_id
  }

  // Check in reply_to_message
  if ('reply_to_message' in msg && msg.reply_to_message) {
    const replyTo = msg.reply_to_message

    if ('thread_id' in replyTo && typeof replyTo.thread_id === 'number') {
      return replyTo.thread_id
    }

    if ('message_thread_id' in replyTo && typeof replyTo.message_thread_id === 'number') {
      return replyTo.message_thread_id
    }
  }

  return undefined
}

// Type for message objects that might have various properties
type MaybeMessage = Record<string, unknown> & {
  reply_to_message?: MaybeMessage & { from?: { id?: number } }
  entities?: Array<{ type?: string; offset: number; length: number }>
  text?: string
  thread_id?: number
  message_thread_id?: number
}

/**
 * Handle messages in listener mode
 * Captures User IDs, Chat IDs, and Topic IDs from incoming messages
 */
export function handleListenerMessage(
  ctx: Context,
  collected: CollectedIds,
  onStartCallback?: (info: string) => void,
  onCaptureCallback?: (type: string, value: number | string) => void
): void {
  const msg = ctx.message
  const from = ctx.from
  const chat = ctx.chat

  if (!msg) {
    return
  }

  collected.messagesCount++

  // Capture User ID (from any message)
  if (from) {
    const isNew = collected.authorizedUserIds.add(from.id)
    if (isNew && onCaptureCallback) {
      onCaptureCallback('User ID', from.id)
      logSuccess(`Captured User ID: ${from.id}`)
    }
  }

  // Capture Chat ID (from group/supergroup/channel messages)
  if (chat && chat.type !== 'private') {
    const isNew = collected.controlChatId !== chat.id
    collected.controlChatId = chat.id
    if (isNew && onCaptureCallback) {
      onCaptureCallback('Chat ID', chat.id)
      logSuccess(`Captured Chat ID: ${chat.id} (${chat.type})`)
    }
  }

  // Capture Topic ID (from forum topics)
  const threadId = getThreadId(msg as unknown as MaybeMessage)
  if (threadId) {
    // If we have a control chat but no control topic yet, this is likely the control topic
    if (collected.controlChatId && !collected.controlTopicId) {
      collected.controlTopicId = threadId
      if (onCaptureCallback) {
        onCaptureCallback('Control Topic ID', threadId)
        logSuccess(`Captured Control Topic ID: ${threadId}`)
      }
    } else if (collected.controlChatId && collected.controlTopicId && threadId !== collected.controlTopicId) {
      // If we already have a control topic, this might be the log topic
      collected.logTopicId = threadId
      collected.logChatId = collected.controlChatId
      if (onCaptureCallback) {
        onCaptureCallback('Log Topic ID', threadId)
        logSuccess(`Captured Log Topic ID: ${threadId}`)
      }
    }
  }

  // Send acknowledgment back to user
  const summary = buildListenerSummary(collected)
  ctx.reply(summary, { parse_mode: 'HTML' }).catch((error) => {
    logError('Failed to send listener summary:', error)
  })
}

/**
 * Build a summary message of captured IDs
 */
function buildListenerSummary(collected: CollectedIds): string {
  const parts: string[] = []

  parts.push('<b>🔧 Auto-Configure Listener</b>')
  parts.push('')

  if (collected.authorizedUserIds.size > 0) {
    parts.push(`<b>👤 User IDs:</b> <code>${[...collected.authorizedUserIds].join(', ')}</code>`)
  }

  if (collected.controlChatId) {
    parts.push(`<b>💬 Chat ID:</b> <code>${collected.controlChatId}</code>`)
  }

  if (collected.controlTopicId) {
    parts.push(`<b>🧵 Control Topic ID:</b> <code>${collected.controlTopicId}</code>`)
  }

  if (collected.logTopicId) {
    parts.push(`<b>📋 Log Topic ID:</b> <code>${collected.logTopicId}</code>`)
  }

  parts.push('')
  parts.push('<i>Send more messages from different contexts to capture more IDs...</i>')

  return parts.join('\n')
}

/**
 * Create initial collected IDs object
 */
export function createInitialCollectedIds(): CollectedIds {
  return {
    authorizedUserIds: new Set<number>(),
    controlChatId: null,
    controlTopicId: null,
    logChatId: null,
    logTopicId: null,
    messagesCount: 0,
  }
}
