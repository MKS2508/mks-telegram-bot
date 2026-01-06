export type { Result, Ok, Err, BotError, BotErrorCode } from '../types/result.js'
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
  botError,
} from '../types/result.js'
