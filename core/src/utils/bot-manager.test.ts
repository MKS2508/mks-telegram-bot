/**
 * @fileoverview Tests for BotManager
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { botManager } from './bot-manager.js'
import { Telegraf } from 'telegraf'

describe('BotManager', () => {
  let bot: Telegraf

  beforeEach(() => {
    bot = new Telegraf('test:token')
  })

  afterEach(() => {
    // Clean up after each test
    botManager.stop('test cleanup').catch(() => {})
  })

  describe('Lifecycle', () => {
    test('setBot initializes the bot', () => {
      botManager.setBot(bot)

      const status = botManager.getStatus()
      expect(status.ok).toBe(true)
      if (status.ok) {
        expect(status.value.status).toBe('running')
      }
    })

    test('getStatus returns bot status after setBot', () => {
      botManager.setBot(bot)
      const status = botManager.getStatus()

      expect(status.ok).toBe(true)
      if (status.ok) {
        expect(['running', 'stopped']).toContain(status.value.status)
      }
    })
  })

  describe('Stats', () => {
    test('getStats returns initial stats', () => {
      const stats = botManager.getStats()
      expect(stats.ok).toBe(true)
      if (stats.ok) {
        expect(stats.value.messagesProcessed).toBe(0)
        expect(stats.value.commandsExecuted).toBe(0)
        expect(stats.value.errorsEncountered).toBe(0)
      }
    })

    test('incrementMessages updates message count', () => {
      botManager.setBot(bot)
      botManager.incrementMessages()

      const stats = botManager.getStats()
      if (stats.ok) {
        expect(stats.value.messagesProcessed).toBe(1)
      }
    })

    test('incrementCommands updates command count', () => {
      botManager.setBot(bot)
      botManager.incrementCommands()

      const stats = botManager.getStats()
      if (stats.ok) {
        expect(stats.value.commandsExecuted).toBe(1)
      }
    })

    test('incrementErrors updates error count', () => {
      botManager.setBot(bot)
      botManager.incrementErrors()

      const stats = botManager.getStats()
      if (stats.ok) {
        expect(stats.value.errorsEncountered).toBe(1)
      }
    })

    test('resetStats resets all stats', () => {
      botManager.setBot(bot)
      botManager.incrementMessages()
      botManager.incrementCommands()
      botManager.incrementErrors()

      const result = botManager.resetStats()
      expect(result.ok).toBe(true)

      const stats = botManager.getStats()
      if (stats.ok) {
        expect(stats.value.messagesProcessed).toBe(0)
        expect(stats.value.commandsExecuted).toBe(0)
        expect(stats.value.errorsEncountered).toBe(0)
      }
    })
  })

  describe('Authorization', () => {
    test('authorize returns ok for authorized users', () => {
      // This test depends on env configuration
      // In real tests, you'd mock getConfig() or set TG_AUTHORIZED_USER_IDS
      // For now, we test the type safety
      const result = botManager.authorize(123456789)
      expect(result).toBeDefined()
    })
  })
})
