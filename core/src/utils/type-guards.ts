import type { Context } from 'telegraf'
import { ok, err, type Result, botError } from '../types/result.js'

export async function sendMessage(
  ctx: Context,
  chatId: string,
  message: string,
  options?: Record<string, unknown>
): Promise<Result<void>> {
  try {
    await ctx.telegram.sendMessage(
      chatId,
      message,
      options as Parameters<typeof ctx.telegram.sendMessage>[2]
    )
    return ok(undefined)
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return err(botError('MESSAGE_FAILED', 'Failed to send message', errorObj))
  }
}

export async function reply(
  ctx: Context,
  message: string,
  options?: Record<string, unknown>
): Promise<Result<void>> {
  try {
    await ctx.reply(message, options as Parameters<typeof ctx.reply>[1])
    return ok(undefined)
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return err(botError('MESSAGE_FAILED', 'Failed to reply', errorObj))
  }
}

export async function editMessage(
  ctx: Context,
  chatId: string,
  messageId: number,
  message: string,
  options?: Record<string, unknown>
): Promise<Result<void>> {
  try {
    await ctx.telegram.editMessageText(
      chatId,
      messageId,
      undefined,
      message,
      options as Parameters<typeof ctx.telegram.editMessageText>[4]
    )
    return ok(undefined)
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return err(botError('MESSAGE_FAILED', 'Failed to edit message', errorObj))
  }
}

export async function answerCallbackQuery(
  ctx: Context,
  text: string,
  options?: Record<string, unknown>
): Promise<Result<void>> {
  try {
    await ctx.answerCbQuery(text, options as Parameters<typeof ctx.answerCbQuery>[1])
    return ok(undefined)
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return err(botError('MESSAGE_FAILED', 'Failed to answer callback query', errorObj))
  }
}
