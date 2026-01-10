import { TelegramMessageBuilder, TelegramKeyboardBuilder } from '@mks2508/telegram-message-builder'
import type { Context } from 'telegraf'
import { handleMediaDemo } from './demo-media.js'
import { handleKeyboardDemo } from './demo-keyboard.js'

export async function handleFullDemo(ctx: Context): Promise<void> {
  const message = TelegramMessageBuilder.text()
    .title('🚀 telegram-message-builder v0.3.0')
    .newline()
    .section('Features')
    .listItem('✨ Fluent API for text formatting')
    .listItem('⌨️ Inline and reply keyboards')
    .listItem('📸 5 media types support')
    .listItem('🎨 HTML, Markdown, MarkdownV2')
    .listItem('🔒 Type-safe with TypeScript')
    .listItem('📦 Zero runtime dependencies')
    .newline()
    .section('Installation')
    .codeBlock('bun add @mks2508/telegram-message-builder', 'bash')
    .newline()
    .section('Quick Start')
    .codeBlock(`import { TelegramMessageBuilder } from '@mks2508/telegram-message-builder'

const message = TelegramMessageBuilder.text()
  .title('Hello World')
  .line('Status', 'Active', { bold: true })
  .build()

ctx.reply(message.text, { parse_mode: message.parse_mode })`, 'typescript')
    .build()

  const keyboard = TelegramKeyboardBuilder.inline()
    .urlButton('📦 npm Package', 'https://www.npmjs.com/package/@mks2508/telegram-message-builder')
    .urlButton('📖 GitHub', 'https://github.com/MKS2508/telegram-message-builder')
    .row()
    .callbackButton('📸 Media Demo', 'full_demo_media')
    .callbackButton('⌨️ Keyboard Demo', 'full_demo_keyboard')
    .buildMarkup()

  await ctx.reply(message.text || '', {
    parse_mode: (message.parse_mode || 'HTML') as any,
    reply_markup: keyboard as any,
  })
}

export async function handleFullDemoCallback(ctx: Context): Promise<void> {
  const callbackData = (ctx.callbackQuery as any)?.data
  await ctx.answerCbQuery()

  switch (callbackData) {
    case 'full_demo_media':
      await handleMediaDemo(ctx)
      break
    case 'full_demo_keyboard':
      await handleKeyboardDemo(ctx)
      break
  }
}
