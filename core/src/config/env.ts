import { z } from 'zod'
import { BotTimeouts, BotLimits } from '../types/constants.js'

export interface EnvConfig {
  botToken: string
  mode: 'polling' | 'webhook'
  webhookUrl?: string
  webhookSecret?: string
  logChatId?: string
  logTopicId?: number
  controlChatId?: string
  controlTopicId?: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

const envSchema = z.object({
  TG_BOT_TOKEN: z.string().min(1),
  TG_MODE: z.enum(['polling', 'webhook']),
  TG_WEBHOOK_URL: z.string().url().optional(),
  TG_WEBHOOK_SECRET: z.string().min(16).optional(),
  TG_LOG_CHAT_ID: z.string().optional(),
  TG_LOG_TOPIC_ID: z.coerce.number().min(1).optional(),
  TG_CONTROL_CHAT_ID: z.string().optional(),
  TG_CONTROL_TOPIC_ID: z.coerce.number().min(1).optional(),
  TG_AUTHORIZED_USER_IDS: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TG_DEBUG: z.coerce.boolean().default(false),
  TG_RATE_LIMIT: z.coerce.number().min(1).max(120).default(BotLimits.RATE_LIMIT_PER_MINUTE),
  TG_TIMEOUT: z.coerce.number().min(1000).default(BotTimeouts.COMMAND_RESPONSE),
  TG_MAX_RETRIES: z.coerce.number().min(1).max(10).default(3),
  TG_COMMAND_PREFIX: z.string().max(10).default('/'),
})

/**
 * Loads and validates environment variables.
 * @returns EnvConfig on success, throws on validation failure
 * @throws Error if environment variables are invalid or required variables are missing
 */
export function loadEnvConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.errors.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n')
    throw new Error(`Invalid environment variables:\n${errors}`)
  }

  const env = result.data

  if (env.TG_MODE === 'webhook' && !env.TG_WEBHOOK_URL) {
    throw new Error('TG_WEBHOOK_URL is required when TG_MODE=webhook')
  }

  return {
    botToken: env.TG_BOT_TOKEN,
    mode: env.TG_MODE,
    webhookUrl: env.TG_WEBHOOK_URL,
    webhookSecret: env.TG_WEBHOOK_SECRET,
    logChatId: env.TG_LOG_CHAT_ID,
    logTopicId: env.TG_LOG_TOPIC_ID,
    controlChatId: env.TG_CONTROL_CHAT_ID,
    controlTopicId: env.TG_CONTROL_TOPIC_ID,
    logLevel: env.LOG_LEVEL,
  }
}
