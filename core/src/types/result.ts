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
} as const

export type BotErrorCode = (typeof BotErrorCode)[keyof typeof BotErrorCode]

export interface BotError {
  code: BotErrorCode
  message: string
  cause?: Error
}

export interface Ok<T> {
  readonly ok: true
  readonly value: T
}

export interface Err<E> {
  readonly ok: false
  readonly error: E
}

export type Result<T, E = BotError> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}

export function botError(code: BotErrorCode, message: string, cause?: Error): BotError {
  return { code, message, cause }
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value
  }
  const errMsg =
    result.error instanceof Object && 'message' in result.error
      ? (result.error as { message: string }).message
      : String(result.error)
  throw new Error(`Unwrap called on Err: ${errMsg}`)
}

export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue
}

export function unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T {
  return isOk(result) ? result.value : fn(result.error)
}

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return isOk(result) ? ok(fn(result.value)) : result
}

export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return isErr(result) ? err(fn(result.error)) : result
}

export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return isOk(result) ? fn(result.value) : result
}

export function tap<T, E>(result: Result<T, E>, fn: (value: T) => void): Result<T, E> {
  if (isOk(result)) {
    fn(result.value)
  }
  return result
}

export function tapErr<T, E>(result: Result<T, E>, fn: (error: E) => void): Result<T, E> {
  if (isErr(result)) {
    fn(result.error)
  }
  return result
}

export function match<T, E, U>(
  result: Result<T, E>,
  handlers: {
    onOk: (value: T) => U
    onErr: (error: E) => U
  }
): U {
  return isOk(result) ? handlers.onOk(result.value) : handlers.onErr(result.error)
}

export function collect<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = []
  for (const result of results) {
    if (isErr(result)) {
      return result
    }
    values.push(result.value)
  }
  return ok(values)
}

export function all<T1, T2, E>(r1: Result<T1, E>, r2: Result<T2, E>): Result<[T1, T2], E>
export function all<T1, T2, T3, E>(
  r1: Result<T1, E>,
  r2: Result<T2, E>,
  r3: Result<T3, E>
): Result<[T1, T2, T3], E>
export function all<T1, T2, T3, T4, E>(
  r1: Result<T1, E>,
  r2: Result<T2, E>,
  r3: Result<T3, E>,
  r4: Result<T4, E>
): Result<[T1, T2, T3, T4], E>
export function all<E>(...results: Result<unknown, E>[]): Result<unknown[], E> {
  return collect(results)
}
