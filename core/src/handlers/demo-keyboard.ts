import { TelegramMessageBuilder, TelegramKeyboardBuilder } from '@mks2508/telegram-message-builder'
import type { Context } from 'telegraf'

export async function handleKeyboardDemo(ctx: Context): Promise<void> {
  const message = TelegramMessageBuilder.text()
    .title('⌨️ Keyboard Demo')
    .newline()
    .text('Try the buttons below:')
    .build()

  const keyboard = TelegramKeyboardBuilder.inline()
    .urlButton('🌐 Visit Website', 'https://github.com/MKS2508/telegram-message-builder')
    .callbackButton('✅ Yes', 'demo_yes')
    .callbackButton('❌ No', 'demo_no')
    .row()
    .callbackButton('🔄 Refresh', 'demo_refresh')
    .callbackButton('🔍 Search', 'demo_search')
    .row()
    .switchInlineQueryButton('🔍 Inline Query', 'query')
    .buildMarkup()

  await ctx.reply(message.text || '', {
    parse_mode: (message.parse_mode || 'HTML') as any,
    reply_markup: keyboard as any,
  })
}

export async function handleKeyboardCallback(ctx: Context): Promise<void> {
  const callbackData = (ctx.callbackQuery as any)?.data
  let response = 'Unknown action'

  switch (callbackData) {
    case 'demo_yes':
      response = '✅ You clicked YES!'
      break
    case 'demo_no':
      response = '❌ You clicked NO!'
      break
    case 'demo_refresh':
      response = '🔄 Content refreshed!'
      break
    case 'demo_search':
      response = '🔍 Searching...'
      break
  }

  await ctx.answerCbQuery(response)
  await ctx.reply(response)
}
