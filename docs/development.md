# Development Guide

Guía completa de desarrollo para extender y modificar el bot.

## Scripts Disponibles

| Script | Descripción | Cuándo Usar |
| ------ | ----------- | ----------- |
| `bun run dev` | Hot reload desarrollo | Desarrollo activo |
| `bun run start` | Producción | Testing en producción |
| `bun run typecheck` | Type-check | Antes de commit |
| `bun run lint` | Linting | Antes de commit |
| `bun run build` | Typecheck + lint | Verificación completa |
| `bun test` | Ejecutar tests | Desarrollo de features |
| `bun run clean:logs` | Limpiar logs | Debugging |
| `bun run doctor` | Diagnóstico | Problemas de configuración |

## Hot Reload

El comando `bun run dev` usa `--watch` para recarga automática:

```bash
bun run dev
```

### Cómo Funciona

1. **Watch** - Bun monitorea archivos en `core/src/`
2. **Detecta cambios** - Al guardar, detecta modificaciones
3. **Recompila** - Recompila automáticamente
4. **Reinicia** - Reinicia el bot sin intervención manual

### Limitaciones

- **No typecheck en vivo** - Solo recompila, no valida tipos
- **Para typecheck** - Usa `bun run typecheck` en otra terminal
- **Timeouts** - El bot puede tardar ~2s en reiniciar

### Flujo Recomendado

**Terminal 1: Bot con hot reload**
```bash
bun run dev
```

**Terminal 2: Typecheck continuo**
```bash
bun run typecheck --watch  # Si estuviera disponible
```

## Agregar Comandos

### 1. Crear Handler

**Archivo**: `core/src/handlers/mycommand.ts`

```typescript
import type { Context } from 'telegraf'

export async function handleMyCommand(ctx: Context): Promise<void> {
  const { message } = ctx
  const username = message?.from?.username ?? 'stranger'

  await ctx.reply(`Hello, ${username}!`)
}
```

### 2. Registrar en Bot

**Archivo**: `core/src/index.ts`

```typescript
import { handleMyCommand } from './handlers/mycommand.js'

bot.command('mycommand', handleMyCommand)
```

### 3. Probar

```bash
bun run dev
# En Telegram: /mycommand
```

### Comandos con Argumentos

```typescript
export async function handleGreet(ctx: Context): Promise<void> {
  const message = ctx.message
  const text = message?.text
  const args = text?.split(' ').slice(1) ?? []
  const name = args[0] ?? 'stranger'

  await ctx.reply(`Hello, ${name}!`)
}
```

Uso: `/greet Alice` → `Hello, Alice!`

## Agregar Middleware

### Middleware Simple

**Archivo**: `core/src/middleware/timestamp.ts`

```typescript
import type { Context, Middleware } from 'telegraf'

export function timestamp(): Middleware<Context> {
  return async (ctx, next) => {
    const start = Date.now()
    await next()
    const duration = Date.now() - start
    console.log(`Request took ${duration}ms`)
  }
}
```

**Registrar**:
```typescript
import { timestamp } from './middleware/timestamp.js'

bot.use(timestamp())
```

### Middleware con Auth

**Archivo**: `core/src/middleware/admin-only.ts`

```typescript
import type { Context, Middleware } from 'telegraf'

const ADMIN_IDS = ['123456789', '987654321']

export function adminOnly(): Middleware<Context> {
  return async (ctx, next) => {
    const userId = ctx.from?.id.toString()

    if (!userId || !ADMIN_IDS.includes(userId)) {
      await ctx.reply('⛔ You are not authorized')
      return
    }

    return next()
  }
}
```

**Usar**:
```typescript
import { adminOnly } from './middleware/admin-only.js'

bot.command('admin', adminOnly(), handleAdmin)
```

## Patrones Comunes

### Manejo de Errors con Result Type

```typescript
import { ok, err, type Result, botError } from '@mks2508/telegram-bot-utils'

function divide(a: number, b: number): Result<number> {
  if (b === 0) {
    return err(botError('INVALID_ARGS', 'Cannot divide by zero'))
  }
  return ok(a / b)
}

// En un handler
export async function handleCalc(ctx: Context): Promise<void> {
  const result = divide(10, 2)

  if (result.ok) {
    await ctx.reply(`Result: ${result.value}`)
  } else {
    await ctx.reply(`Error: ${result.error.message}`)
  }
}
```

### Logging con Better Logger

```typescript
import { botLogger, kv, badge } from '@mks2508/telegram-bot-utils'

export async function handleMyCommand(ctx: Context): Promise<void> {
  botLogger.info(`${badge('CMD')} /mycommand`, kv({ user: ctx.from.id }))

  try {
    // ... logic
    botLogger.success('Command executed successfully')
  } catch (error) {
    botLogger.error('Command failed:', error)
  }
}
```

### Async Operations con Timeout

```typescript
async function fetchWithTimeout(url: string, timeout = 5000): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { signal: controller.signal })
    const text = await response.text()
    return text
  } finally {
    clearTimeout(timeoutId)
  }
}
```

## Debugging

### Logs en Consola

El bot usa Better Logger con preset cyberpunk:

```
[Bot] ℹ Bot started successfully
[Bot] ✓ Polling for updates...
[Cmd] ℹ /health from user 123456789
[Bot] ✓ Health check completed in 45ms
```

### Ver Variables de Entorno

```bash
# Ver todas las variables
cat core/.env.local

# Ver variable específica
grep TG_BOT_TOKEN core/.env.local
```

### Ver Instancias Corriendo

```bash
bun run cli status
```

### Ver Logs Archivados

```bash
# Logs de info
cat core/logs/info.log

# Logs de error
cat core/logs/error.log
```

### Habilitar Debug Mode

En `core/.env.local`:
```bash
TG_DEBUG=true
LOG_LEVEL=debug
```

## Testing

### Escribir Tests

**Archivo**: `core/src/handlers/mycommand.test.ts`

```typescript
import { describe, test, expect } from 'bun:test'
import { handleMyCommand } from './mycommand.js'

describe('handleMyCommand', () => {
  test('debe responder con greeting', async () => {
    const mockCtx = {
      from: { id: 123, username: 'testuser' },
      reply: async (msg: string) => msg,
    }

    await handleMyCommand(mockCtx as never)
    expect(mockCtx.reply).toHaveBeenCalledWith('Hello, testuser!')
  })
})
```

### Ejecutar Tests

```bash
# Todos los tests
bun test

# Un archivo específico
bun test core/src/handlers/mycommand.test.ts

# Watch mode
bun test --watch

# Con coverage
bun test --coverage
```

## Antes de Commitear

### Checklist

- [ ] `bun run typecheck` → 0 errores
- [ ] `bun run lint` → 0 warnings, 0 errors
- [ ] `bun test` → Todos los tests pasan
- [ ] No `console.log` (usar `botLogger`)
- [ ] Código formateado

### Precommit Hook (Opcional)

```json
{
  "scripts": {
    "precommit": "bun run build && bun test"
  }
}
```

Usar con Husky o similar:
```bash
npm pkg set scripts.precommit="bun run precommit"
```

## Estructura de Archivos

```
core/src/
├── index.ts              # Entry point, registro de comandos
├── config/
│   ├── env.ts           # Zod schema para env
│   └── index.ts         # Config singleton
├── handlers/            # Command handlers
│   ├── health.ts
│   ├── control.ts
│   └── mycommand.ts     # Tus comandos aquí
├── middleware/          # Telegraf middleware
│   ├── auth.ts
│   ├── error-handler.ts
│   └── mymiddleware.ts  # Tu middleware aquí
├── types/              # TypeScript types
│   ├── result.ts       # Result type (re-export)
│   └── bot.ts          # Bot-specific types
└── utils/              # Utilities
    ├── bot-manager.ts  # Bot lifecycle
    ├── instance-manager.ts
    └── myutil.ts       # Tus utils aquí
```

## Recursos Adicionales

- **Telegraf Docs** - [telegraf.js.org](https://telegraf.js.org/)
- **Telegram Bot API** - [core.telegram.org/bots/api](https://core.telegram.org/bots/api)
- **Better Logger** - [@mks2508/better-logger](https://github.com/mks2508/better-logger)
- **CLAUDE.dev.md** - [Guía de desarrollo completa](../CLAUDE.dev.md)

## Referencias

- [Getting Started](./getting-started.md) - Primeros pasos
- [CLI Commands](./cli-commands.md) - Comandos CLI
- [Environment](./environment.md) - Variables de entorno
