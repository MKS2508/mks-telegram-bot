import { config as loadEnv } from 'dotenv'

export interface ConfigOptions {
  envPath?: string
  required?: string[]
}

export function loadBotConfig(options: ConfigOptions = {}) {
  if (options.envPath) {
    return loadEnv({ path: options.envPath })
  }
  return loadEnv()
}
