# Example: Auth Middleware

Ejemplo de cómo crear middleware de autenticación para comandos restringidos.

## Middleware: Solo Usuarios Autorizados

### Paso 1: Crear Middleware

**Archivo**: `core/src/middleware/auth-only.ts`

```typescript
import type { Context, Middleware } from 'telegraf'
import { botLogger, badge } from '@mks2508/telegram-bot-utils'

interface AuthOnlyOptions {
  authorizedIds: Set<string>
  allowGroups?: boolean
}

export function authOnly(options: AuthOnlyOptions): Middleware<Context> {
  const { authorizedIds, allowGroups = false } = options

  return async (ctx, next) => {
    const userId = ctx.from?.id.toString()

    // Verificar usuario
    if (!userId) {
      botLogger.warn(`${badge('AUTH')} No user ID in context`)
      await ctx.reply('⛔ Could not identify user')
      return
    }

    // Verificar autorización
    if (!authorizedIds.has(userId)) {
      botLogger.warn(`${badge('AUTH')} Unauthorized access attempt`, {
        user: userId,
        command: ctx.message?.text,
      })
      await ctx.reply('⛔ You are not authorized to use this command')
      return
    }

    // Usuario autorizado, continuar
    botLogger.info(`${badge('AUTH')} User authorized`, { user: userId })
    return next()
  }
}
```

### Paso 2: Crear Configuración de Usuarios

**Archivo**: `core/src/config/auth.ts`

```typescript
import { getConfig } from './index.js'

export function getAuthorizedUsers(): Set<string> {
  const config = getConfig()
  const authorizedIds = config.authorizedUserIds

  if (!authorizedIds) {
    return new Set()
  }

  return new Set(authorizedIds.split(',').map((id) => id.trim()))
}

// IDs para desarrollo
export const DEV_USER_IDS = new Set([
  '123456789', // Reemplaza con tu ID
])

// IDs para producción (desde env)
export function getProdUserIds(): Set<string> {
  return getAuthorizedUsers()
}
```

### Paso 3: Usar en Comandos

**Archivo**: `core/src/handlers/admin.ts`

```typescript
import type { Context } from 'telegraf'
import { authOnly, getProdUserIds } from '../middleware/auth-only.js'
import { botLogger } from '@mks2508/telegram-bot-utils'

export async function handleAdmin(ctx: Context): Promise<void> {
  // Este comando solo funciona si el middleware auth pasa
  await ctx.reply('🔐 Admin panel')
  await ctx.reply('Available commands: /users, /stats, /broadcast')
}

// Registrar con middleware
export function registerAdminCommands(bot: any) {
  const prodUserIds = getProdUserIds()

  bot.command('admin', authOnly({ authorizedIds: prodUserIds }), handleAdmin)
}
```

**En `core/src/index.ts`**:
```typescript
import { registerAdminCommands } from './handlers/admin.js'

// ... después de otros comandos
registerAdminCommands(bot)
```

## Middleware: Chat Type

Solo permitir comandos en privados (no grupos):

```typescript
import type { Context, Middleware } from 'telegraf'

export function privateOnly(): Middleware<Context> {
  return async (ctx, next) => {
    const chatType = ctx.chat?.type

    if (chatType !== 'private') {
      await ctx.reply('⚠️ This command only works in private chat')
      return
    }

    return next()
  }
}
```

Usar:
```typescript
bot.command('secret', privateOnly(), handleSecret)
```

## Middleware: Group Only

Solo permitir comandos en grupos:

```typescript
import type { Context, Middleware } from 'telegraf'

export function groupOnly(): Middleware<Context> {
  return async (ctx, next) => {
    const chatType = ctx.chat?.type

    if (chatType !== 'group' && chatType !== 'supergroup') {
      await ctx.reply('⚠️ This command only works in groups')
      return
    }

    return next()
  }
}
```

## Middleware: Admin del Chat

Solo permitir admins del chat:

```typescript
import type { Context, Middleware } from 'telegraf'

export function chatAdminOnly(): Middleware<Context> {
  return async (ctx, next) => {
    const chatId = ctx.chat?.id
    const userId = ctx.from?.id

    if (!chatId || !userId) {
      await ctx.reply('⚠️ Could not identify chat or user')
      return
    }

    try {
      // Verificar si el usuario es admin del chat
      const member = await ctx.getChatMember(userId)

      if (
        member.status !== 'creator' &&
        member.status !== 'administrator'
      ) {
        await ctx.reply('⛔ Only chat admins can use this command')
        return
      }

      return next()
    } catch (error) {
      botLogger.error('Failed to check chat admin status', error)
      await ctx.reply('⚠️ Could not verify admin status')
      return
    }
  }
}
```

## Middleware: Rate Limiting

Limitar frecuencia de comandos por usuario:

```typescript
import type { Context, Middleware } from 'telegraf'

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimits = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  maxRequests: number
  windowMs: number
}

export function rateLimit(options: RateLimitOptions): Middleware<Context> {
  const { maxRequests, windowMs } = options

  return async (ctx, next) => {
    const userId = ctx.from?.id.toString()

    if (!userId) {
      return next()
    }

    const now = Date.now()
    const entry = rateLimits.get(userId)

    if (!entry || now > entry.resetTime) {
      // Nueva ventana
      rateLimits.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      })
      return next()
    }

    if (entry.count >= maxRequests) {
      const waitTime = Math.ceil((entry.resetTime - now) / 1000)
      await ctx.reply(
        `⚠️ Rate limit exceeded. Wait ${waitTime}s before trying again.`
      )
      return
    }

    entry.count++
    return next()
  }
}
```

Usar:
```typescript
// Máximo 5 comandos por minuto
bot.command('search', rateLimit({ maxRequests: 5, windowMs: 60000 }), handleSearch)
```

## Middleware Combinado

Combinar múltiples middleware:

```typescript
bot.command(
  'admin',
  authOnly({ authorizedIds: getProdUserIds() }),
  chatAdminOnly(),
  rateLimit({ maxRequests: 10, windowMs: 60000 }),
  handleAdmin
)
```

## Obtener User IDs

### Método 1: Usar el Comando /whoami

**Archivo**: `core/src/handlers/debug.ts`

```typescript
export async function handleWhoami(ctx: Context): Promise<void> {
  const user = ctx.from
  const chat = ctx.chat

  const info = [
    `👤 User Info:`,
    `ID: ${user?.id}`,
    `Username: @${user?.username ?? 'none'}`,
    `First Name: ${user?.first_name ?? 'none'}`,
    `Last Name: ${user?.last_name ?? 'none'}`,
    ```,
    `💬 Chat Info:`,
    `ID: ${chat?.id}`,
    `Type: ${chat?.type}`,
    `Title: ${chat?.title ?? 'none'}`,
  ].join('\n')

  await ctx.reply(info)
}
```

### Método 2: Usar @GetTelegraphBot

1. Enviar un mensaje al bot
2. Forward el mensaje a @GetTelegraphBot
3. El bot responde con tu ID

### Método 3: Desde Logs

```bash
bun run dev
# Enviar cualquier comando al bot
# Ver el log:
[Cmd] ℹ /start from user 123456789
```

## Configurar IDs Autorizados

En `core/.env.local`:

```bash
# IDs separados por coma
TG_AUTHORIZED_USER_IDS=123456789,987654321
```

## Resumen

1. **Crear middleware** en `core/src/middleware/`
2. **Definir opciones** (authorized IDs, rate limits, etc.)
3. **Aplicar a comandos** en `core/src/index.ts`
4. **Obtener user IDs** con /whoami o @GetTelegraphBot
5. **Configurar IDs** en `.env.local`

## Próximos Pasos

- [Simple Command Example](./simple-command.md) - Crear comandos
- [Webhook Setup Example](./webhook-setup.md) - Configurar webhook
- [Development Guide](../development.md) - Más middleware patterns
