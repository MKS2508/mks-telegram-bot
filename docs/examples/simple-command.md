# Example: Simple Command

Ejemplo completo de cómo agregar un comando simple al bot.

## Comando: `/echo`

Repite el mensaje que el usuario envía.

## Paso 1: Crear Handler

**Archivo**: `core/src/handlers/echo.ts`

```typescript
import type { Context } from 'telegraf'
import { botLogger, badge, kv } from '@mks2508/telegram-bot-utils'

export async function handleEcho(ctx: Context): Promise<void> {
  const message = ctx.message
  const text = message?.text ?? ''

  // Extraer argumentos (todo después de /echo)
  const args = text.split(' ').slice(1).join(' ')

  if (!args) {
    await ctx.reply('Usage: /echo <message>')
    return
  }

  // Log el comando
  botLogger.info(`${badge('CMD')} /echo`, kv({
    user: ctx.from?.id,
    message: args,
  }))

  // Responder
  await ctx.reply(args)
}
```

## Paso 2: Registrar en Bot

**Archivo**: `core/src/index.ts`

```typescript
import { handleEcho } from './handlers/echo.js'

// ... después de bot.command('health', handleHealth)

bot.command('echo', handleEcho)
```

## Paso 3: Probar

```bash
bun run dev
```

En Telegram:
```
Usuario: /echo hola mundo
Bot: hola mundo
```

## Variación: Echo con Mayúsculas

```typescript
export async function handleEchoShout(ctx: Context): Promise<void> {
  const message = ctx.message
  const text = message?.text ?? ''
  const args = text.split(' ').slice(1).join(' ')

  if (!args) {
    await ctx.reply('Usage: /echoshout <message>')
    return
  }

  botLogger.info(`${badge('CMD')} /echoshout`, kv({
    user: ctx.from?.id,
    message: args,
  }))

  // Convertir a mayúsculas y agregar emojis
  const shouted = `📢 ${args.toUpperCase()} 🔊`

  await ctx.reply(shouted)
}
```

Registrar:
```typescript
bot.command('echoshout', handleEchoShout)
```

## Variación: Echo con Repetición

```typescript
interface EchoOptions {
  times?: number
  delay?: number
}

export async function handleEchoRepeat(ctx: Context): Promise<void> {
  const message = ctx.message
  const text = message?.text ?? ''
  const args = text.split(' ').slice(1)

  // Parsear opciones
  const options: EchoOptions = {}
  let messageText = ''

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--times' && args[i + 1]) {
      options.times = Number.parseInt(args[i + 1], 10)
      i++
    } else if (arg === '--delay' && args[i + 1]) {
      options.delay = Number.parseInt(args[i + 1], 10)
      i++
    } else {
      messageText = args.slice(i).join(' ')
      break
    }
  }

  if (!messageText) {
    await ctx.reply('Usage: /echorepeat [--times N] [--delay MS] <message>')
    return
  }

  const times = options.times ?? 1
  const delay = options.delay ?? 500

  if (times < 1 || times > 10) {
    await ctx.reply('Times must be between 1 and 10')
    return
  }

  botLogger.info(`${badge('CMD')} /echorepeat`, kv({
    user: ctx.from?.id,
    message: messageText,
    times,
    delay,
  }))

  // Enviar mensajes con delay
  for (let i = 0; i < times; i++) {
    await ctx.reply(`${i + 1}. ${messageText}`)
    if (i < times - 1) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

Uso:
```
/echorepeat hola              → "1. hola"
/echorepeat --times 3 hola    → "1. hola", "2. hola", "3. hola"
/echorepeat --delay 1000 hola → "1. hola" (1s delay) "2. hola"
```

## Manejo de Errors

```typescript
import { botError, err, type Result } from '@mks2508/telegram-bot-utils'

function validateEchoMessage(message: string): Result<string> {
  if (!message || message.trim().length === 0) {
    return err(botError('INVALID_ARGS', 'Message cannot be empty'))
  }

  if (message.length > 1000) {
    return err(botError('INVALID_ARGS', 'Message too long (max 1000 chars)'))
  }

  return { ok: true, value: message }
}

export async function handleEchoSafe(ctx: Context): Promise<void> {
  const message = ctx.message
  const text = message?.text ?? ''
  const args = text.split(' ').slice(1).join(' ')

  const result = validateEchoMessage(args)

  if (!result.ok) {
    botLogger.error('Echo validation failed', result.error)
    await ctx.reply(`Error: ${result.error.message}`)
    return
  }

  await ctx.reply(result.value)
}
```

## Resumen

1. **Crear handler** en `core/src/handlers/`
2. **Importar y registrar** en `core/src/index.ts`
3. **Probar** con `bun run dev`
4. **Commitear** después de verificar typecheck y lint

## Próximos Pasos

- [Middleware Auth Example](./middleware-auth.md) - Agregar autenticación
- [Webhook Setup Example](./webhook-setup.md) - Configurar webhook
- [Development Guide](../development.md) - Más patrones
