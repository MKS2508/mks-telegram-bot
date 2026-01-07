/**
 * @fileoverview File logging configuration for Telegram bot
 */

import { FileLogHandler, addHandler } from '@mks2508/better-logger'
import { setupLogger, botLogger } from '@mks2508/telegram-bot-utils'
import { getConfig } from './index.js'
import { mkdirSync, existsSync } from 'fs'
import path from 'path'

export interface FileLoggingConfig {
  enabled: boolean
  logDir: string
  maxFileSize: number
  maxFiles: number
  fileLogLevels: ('debug' | 'info' | 'success' | 'warn' | 'error' | 'critical')[]
}

const DEFAULT_CONFIG: FileLoggingConfig = {
  enabled: process.env.TG_LOG_FILE_ENABLED !== 'false',
  logDir: process.env.TG_LOG_DIR || path.join(process.cwd(), 'logs'),
  maxFileSize: Number(process.env.TG_LOG_MAX_SIZE) || 1024 * 1024, // 1MB default
  maxFiles: Number(process.env.TG_LOG_MAX_FILES) || 5,
  fileLogLevels: (process.env.TG_LOG_LEVELS?.split(',') || [
    'debug',
    'info',
    'success',
    'warn',
    'error',
    'critical',
  ]) as FileLoggingConfig['fileLogLevels'],
}

let fileHandlersInitialized = false

/**
 * Initialize file logging with Better Logger FileLogHandler
 *
 * Creates separate log files for each log level and adds them as handlers
 * to the global logger instance.
 *
 * @param config - Partial configuration to override defaults
 *
 * @example
 * // Use defaults
 * initializeFileLogging()
 *
 * @example
 * // Custom configuration
 * initializeFileLogging({
 *   enabled: true,
 *   logDir: './var/log',
 *   maxFileSize: 5 * 1024 * 1024, // 5MB
 *   fileLogLevels: ['error', 'critical']
 * })
 */
export function initializeFileLogging(
  config: Partial<FileLoggingConfig> = {}
): void {
  // Setup logger with debug/logLevel options
  const appConfig = getConfig()
  setupLogger({ debug: appConfig.debug, logLevel: appConfig.logLevel })

  if (fileHandlersInitialized) {
    botLogger.warn('File logging already initialized')
    return
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  if (!finalConfig.enabled) {
    botLogger.info('File logging disabled via configuration')
    return
  }

  // Create logs directory if it doesn't exist
  if (!existsSync(finalConfig.logDir)) {
    try {
      mkdirSync(finalConfig.logDir, { recursive: true })
      botLogger.info(`Created log directory: ${finalConfig.logDir}`)
    } catch (error) {
      botLogger.error('Failed to create log directory:', error)
      return
    }
  }

  // Add file handler for each log level
  for (const level of finalConfig.fileLogLevels) {
    const fileName = path.join(finalConfig.logDir, `${level}.log`)
    const handler = new FileLogHandler(fileName, finalConfig.maxFileSize)
    addHandler(handler)
  }

  fileHandlersInitialized = true
  botLogger.success(
    `File logging initialized: ${finalConfig.logDir} (levels: ${finalConfig.fileLogLevels.join(', ')})`
  )
}

/**
 * Check if file logging is initialized
 */
export function isFileLoggingInitialized(): boolean {
  return fileHandlersInitialized
}

/**
 * Get the current file logging configuration
 */
export function getFileLoggingConfig(): FileLoggingConfig {
  return { ...DEFAULT_CONFIG }
}
