import { z } from 'zod'
import { BotTimeouts, BotLimits } from '../types/constants.js'
import { readFileSync, existsSync, readlinkSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

export enum Environment {
  LOCAL = 'local',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

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

  // Environment identification
  environment: Environment
  instanceName: string
  instanceId?: string

  // Instance detection
  instanceCheck: boolean
  lockBackend: 'pid' | 'redis'
  redisUrl?: string

  // ngrok configuration
  ngrokEnabled: boolean
  ngrokPort: number
  ngrokDomain?: string
  ngrokRegion: string
  ngrokAuthToken?: string
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
  // File logging configuration
  TG_LOG_FILE_ENABLED: z.string().optional(),
  TG_LOG_DIR: z.string().optional(),
  TG_LOG_MAX_SIZE: z.coerce.number().min(1024).optional(),
  TG_LOG_MAX_FILES: z.coerce.number().min(1).max(100).optional(),
  TG_LOG_LEVELS: z.string().optional(),

  // === Environment Identification ===
  TG_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  TG_INSTANCE_NAME: z.string().default('mks-bot'),
  TG_INSTANCE_ID: z.string().optional(),

  // === Instance Detection ===
  TG_INSTANCE_CHECK: z.coerce.boolean().default(true),
  TG_LOCK_BACKEND: z.enum(['pid', 'redis']).default('pid'),
  TG_REDIS_URL: z.string().optional(),

  // === ngrok Configuration ===
  TG_NGROK_ENABLED: z.coerce.boolean().default(false),
  TG_NGROK_PORT: z.coerce.number().default(3000),
  TG_NGROK_DOMAIN: z.string().optional(),
  TG_NGROK_REGION: z.string().default('us'),
  TG_NGROK_AUTH_TOKEN: z.string().optional(),
}).refine((data) => {
  // Webhook URL validation when mode is webhook
  if (data.TG_MODE === 'webhook' && !data.TG_WEBHOOK_URL && !data.TG_NGROK_ENABLED) {
    return false
  }
  return true
}, {
  message: 'TG_WEBHOOK_URL is required when TG_MODE=webhook and TG_NGROK_ENABLED=false',
})

/**
 * Get the directory of the current module
 */
function getModuleDir(): string {
  const __filename = fileURLToPath(import.meta.url)
  return dirname(__filename)
}

/**
 * Load .env file from the new .envs/ structure
 * @param botUsername Bot username (without @)
 * @param environment Environment (local, staging, production)
 * @returns Parsed environment variables or null if file doesn't exist
 */
function loadEnvFile(botUsername: string, environment: string): Record<string, string> | null {
  const coreDir = resolve(getModuleDir(), '../..')
  const envPath = resolve(coreDir, '.envs', botUsername, `${environment}.env`)

  if (!existsSync(envPath)) {
    return null
  }

  const content = readFileSync(envPath, 'utf-8')
  const envVars: Record<string, string> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const [key, ...valueParts] = trimmed.split('=')
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=')
    }
  }

  return envVars
}

/**
 * Get the active bot username from TG_BOT env var or .active symlink
 * @returns Bot username or null if not found
 */
function getActiveBot(): string | null {
  // Check TG_BOT env var first
  if (process.env.TG_BOT) {
    return process.env.TG_BOT
  }

  // Check .active symlink
  const coreDir = resolve(getModuleDir(), '../..')
  const activeSymlink = resolve(coreDir, '.envs', '.active')

  if (!existsSync(activeSymlink)) {
    return null
  }

  try {
    const target = readlinkSync(activeSymlink)
    return target
  } catch {
    return null
  }
}

/**
 * Loads and validates environment variables.
 * Supports both the new .envs/ structure and legacy .env.{environment} files.
 * @returns EnvConfig on success, throws on validation failure
 * @throws Error if environment variables are invalid or required variables are missing
 */
export function loadEnvConfig(): EnvConfig {
  // Try to load from new .envs/ structure first
  const activeBot = getActiveBot()
  const environment = process.env.TG_ENV || 'local'

  // Filter out undefined values from process.env
  const processEnvClean: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      processEnvClean[key] = value
    }
  }

  let envVars: Record<string, string> = { ...processEnvClean }

  if (activeBot) {
    // Load bot-specific environment file
    const botEnvVars = loadEnvFile(activeBot, environment)
    if (botEnvVars) {
      // Merge bot env vars with process.env (bot vars take precedence)
      envVars = { ...processEnvClean, ...botEnvVars }
    } else {
      // Fallback to old structure
      const coreDir = resolve(getModuleDir(), '../..')
      const oldEnvPath = resolve(coreDir, `.env.${environment}`)

      if (existsSync(oldEnvPath)) {
        const content = readFileSync(oldEnvPath, 'utf-8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) {
            continue
          }
          const [key, ...valueParts] = trimmed.split('=')
          if (key && valueParts.length > 0) {
            envVars[key] = valueParts.join('=')
          }
        }
      }
    }
  } else {
    // No active bot, try old structure
    const coreDir = resolve(getModuleDir(), '../..')
    const oldEnvPath = resolve(coreDir, `.env.${environment}`)

    if (existsSync(oldEnvPath)) {
      const content = readFileSync(oldEnvPath, 'utf-8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) {
          continue
        }
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=')
        }
      }
    }
  }

  const result = envSchema.safeParse(envVars)

  if (!result.success) {
    const errors = result.error.errors.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n')
    throw new Error(`Invalid environment variables:\n${errors}`)
  }

  const env = result.data

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

    // Environment identification
    environment: env.TG_ENV as Environment,
    instanceName: env.TG_INSTANCE_NAME,
    instanceId: env.TG_INSTANCE_ID,

    // Instance detection
    instanceCheck: env.TG_INSTANCE_CHECK,
    lockBackend: env.TG_LOCK_BACKEND,
    redisUrl: env.TG_REDIS_URL,

    // ngrok configuration
    ngrokEnabled: env.TG_NGROK_ENABLED,
    ngrokPort: env.TG_NGROK_PORT,
    ngrokDomain: env.TG_NGROK_DOMAIN,
    ngrokRegion: env.TG_NGROK_REGION,
    ngrokAuthToken: env.TG_NGROK_AUTH_TOKEN,
  }
}
