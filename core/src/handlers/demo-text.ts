import { TelegramMessageBuilder, fmt } from '@mks2508/telegram-message-builder'
import type { Context } from 'telegraf'

export async function handleTextDemo(ctx: Context): Promise<void> {
  const message = TelegramMessageBuilder.text()
    .title('🎨 Text Formatting Demo')
    .newline()
    .section('Inline Formatting')
    .line('Bold', fmt.bold('This is bold text'))
    .line('Italic', fmt.italic('This is italic text'))
    .line('Code', fmt.code('const x = 1'))
    .line('Link', fmt.link('Click here', 'https://example.com'))
    .newline()
    .section('Special Elements')
    .line('Mention', fmt.mention(123456, 'Username'))
    .line('Hashtag', fmt.hashtag('telegram'))
    .newline()
    .codeBlock(`console.log('Hello from telegram-message-builder!')`, 'javascript')
    .newline()
    .separator()
    .listItem('Feature 1: Fluent API')
    .listItem('Feature 2: Type-safe')
    .listItem('Feature 3: Zero dependencies')
    .build()

  await ctx.reply(message.text || '', { parse_mode: (message.parse_mode || 'HTML') as any })
}
