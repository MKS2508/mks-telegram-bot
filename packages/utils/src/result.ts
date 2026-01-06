/**
 * @fileoverview Result<T,E> monad for type-safe error handling without exceptions.
 * Re-exports from @mks2508/no-throw with Telegram Bot-specific types.
 */

// Re-export everything from @mks2508/no-throw
export {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  map,
  mapErr,
  flatMap,
  tap,
  tapErr,
  match,
  collect,
  all,
  resultError,
  UNKNOWN_ERROR,
  type Result,
  type Ok,
  type Err,
} from '@mks2508/no-throw'

import type { ResultError as GenericResultError, ErrorCode as ErrorCodeHelper } from '@mks2508/no-throw'
import { err, resultError } from '@mks2508/no-throw'

/**
 * Telegram Bot-specific error codes.
 */
export const BotErrorCode = {
  BotNotRunning: 'BOT_NOT_RUNNING',
  InvalidMode: 'INVALID_MODE',
  WebhookNotConfigured: 'WEBHOOK_NOT_CONFIGURED',
  Unauthorized: 'UNAUTHORIZED',
  TopicNotFound: 'TOPIC_NOT_FOUND',
  MessageFailed: 'MESSAGE_FAILED',
  BotStopped: 'BOT_STOPPED',
  StartFailed: 'START_FAILED',
  StopFailed: 'STOP_FAILED',
  RestartFailed: 'RESTART_FAILED',
  ModeSwitchFailed: 'MODE_SWITCH_FAILED',
  ConfigError: 'CONFIG_ERROR',
  InvalidCommandArgs: 'INVALID_COMMAND_ARGS',
  RateLimitExceeded: 'RATE_LIMIT_EXCEEDED',
  CommandTimeout: 'COMMAND_TIMEOUT',
  WebhookSetupFailed: 'WEBHOOK_SETUP_FAILED',
  InstanceConflict: 'INSTANCE_CONFLICT',
  Unknown: 'UNKNOWN',
} as const

export type BotErrorCode = ErrorCodeHelper<typeof BotErrorCode>

/**
 * Telegram Bot-specific ResultError with typed error codes.
 */
export type BotError = GenericResultError<BotErrorCode>

/**
 * Creates a BotError with the given code, message, and optional cause.
 */
export function botError(code: BotErrorCode, message: string, cause?: Error): BotError {
  return resultError(code, message, cause)
}

/**
 * Creates a failure Result with a BotError.
 */
export function fail(
  code: BotErrorCode,
  message: string,
  cause?: Error
): { ok: false; error: BotError } {
  return err(botError(code, message, cause))
}
