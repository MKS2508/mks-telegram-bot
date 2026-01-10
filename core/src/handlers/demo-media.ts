import { TelegramMessageBuilder, TelegramMediaBuilder, TelegramKeyboardBuilder } from '@mks2508/telegram-message-builder'
import type { Context } from 'telegraf'

export async function handleMediaDemo(ctx: Context): Promise<void> {
  const message = TelegramMessageBuilder.text()
    .title('📸 Media Builder Demo')
    .newline()
    .text('Choose a media type to test:')
    .listItem('Photo with caption')
    .listItem('Video with options')
    .listItem('Document with metadata')
    .listItem('Audio with performer info')
    .listItem('Voice message')
    .build()

  const keyboard = TelegramKeyboardBuilder.inline()
    .callbackButton('📷 Photo', 'media_photo')
    .callbackButton('🎥 Video', 'media_video')
    .row()
    .callbackButton('📄 Document', 'media_document')
    .callbackButton('🎵 Audio', 'media_audio')
    .row()
    .callbackButton('🎤 Voice', 'media_voice')
    .buildMarkup()

  await ctx.reply(message.text || '', {
    parse_mode: (message.parse_mode || 'HTML') as any,
    reply_markup: keyboard as any,
  })
}

export async function handleMediaCallback(ctx: Context): Promise<void> {
  const callbackData = (ctx.callbackQuery as any)?.data
  await ctx.answerCbQuery()

  switch (callbackData) {
    case 'media_photo':
      await sendPhotoDemo(ctx)
      break
    case 'media_video':
      await sendVideoDemo(ctx)
      break
    case 'media_document':
      await sendDocumentDemo(ctx)
      break
    case 'media_audio':
      await sendAudioDemo(ctx)
      break
    case 'media_voice':
      await sendVoiceDemo(ctx)
      break
  }
}

async function sendPhotoDemo(ctx: Context): Promise<void> {
  const photo = TelegramMediaBuilder.photo('https://picsum.photos/800/600')
    .caption('📷 Photo Demo\n\nThis is a photo with caption formatting support!')
    .setParseMode('html')
    .build()

  const media = typeof photo.media === 'string' ? photo.media : undefined

  if (!media) {
    await ctx.reply('❌ Media source must be a URL or file_id')
    return
  }

  await ctx.replyWithPhoto(media, {
    caption: photo.caption || undefined,
    parse_mode: photo.parse_mode as any,
  })
}

async function sendVideoDemo(ctx: Context): Promise<void> {
  const video = TelegramMediaBuilder.video('https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4')
    .caption('🎥 Video Demo\n\nDuration: 10s\nResolution: 1280x720')
    .duration(10)
    .width(1280)
    .height(720)
    .enableStreaming()
    .setParseMode('html')
    .build()

  const media = typeof video.media === 'string' ? video.media : undefined

  if (!media) {
    await ctx.reply('❌ Media source must be a URL or file_id')
    return
  }

  await ctx.replyWithVideo(media, {
    caption: video.caption || undefined,
    parse_mode: video.parse_mode as any,
    width: video.width as number,
    height: video.height as number,
    duration: video.duration as number,
    supports_streaming: true,
  })
}

async function sendDocumentDemo(ctx: Context): Promise<void> {
  const doc = TelegramMediaBuilder.document('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
    .caption('📄 Document Demo\n\nThis is a PDF document with custom filename.')
    .fileName('sample-document.pdf')
    .mimeType('application/pdf')
    .build()

  const media = typeof doc.media === 'string' ? doc.media : undefined

  if (!media) {
    await ctx.reply('❌ Media source must be a URL or file_id')
    return
  }

  await ctx.replyWithDocument(media, {
    caption: doc.caption || undefined,
    parse_mode: doc.parse_mode as any,
  })
}

async function sendAudioDemo(ctx: Context): Promise<void> {
  const audio = TelegramMediaBuilder.audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3')
    .caption('🎵 Audio Demo\n\nArtist: Demo Artist\nTitle: Demo Song')
    .performer('Demo Artist')
    .title('Demo Song')
    .duration(180)
    .build()

  const media = typeof audio.media === 'string' ? audio.media : undefined

  if (!media) {
    await ctx.reply('❌ Media source must be a URL or file_id')
    return
  }

  await ctx.replyWithAudio(media, {
    caption: audio.caption || undefined,
    parse_mode: audio.parse_mode as any,
    performer: audio.performer as string,
    title: audio.title as string,
    duration: audio.duration as number,
  })
}

async function sendVoiceDemo(ctx: Context): Promise<void> {
  const voice = TelegramMediaBuilder.voice('https://sample-videos.com/audio/mp3/crowd-cheering.mp3')
    .caption('🎤 Voice Demo\n\nThis is a voice message.')
    .duration(5)
    .build()

  const media = typeof voice.media === 'string' ? voice.media : undefined

  if (!media) {
    await ctx.reply('❌ Media source must be a URL or file_id')
    return
  }

  await ctx.replyWithVoice(media, {
    caption: voice.caption || undefined,
    parse_mode: voice.parse_mode as any,
    duration: voice.duration as number,
  })
}
