# CLAUDE.dev - Guía de Desarrollo

> **Parte de**: [CLAUDE.md](./CLAUDE.md) | Ver también: [CLAUDE.deploy.md](./CLAUDE.deploy.md)

Guía de desarrollo para extender y modificar el bot template.

**Documentación relacionada**:
- [docs/development.md](./docs/development.md)
- [docs/getting-started.md](./docs/getting-started.md)

---

## Development Standards

### Code Style

- TypeScript strict mode enabled
- `noUncheckedIndexedAccess: true` - arrays need undefined checks
- Semi: false, singleQuote: true
- Result type pattern para error handling
- Better Logger para logging (no console.*)

### Before Commit Checklist

- [ ] `bun run typecheck` → 0 errores
- [ ] `bun run lint` → 0 warnings, 0 errors
- [ ] `bun test` → all tests pass
- [ ] No `console.*` statements
- [ ] Código formateado (`bun run format:check`)

---

## Agregando Commands

### 1. Crear Handler

**Archivo**: `core/src/handlers/mycommand.ts`

```typescript
import type { Context } from 'telegraf'
import { myCommandLogger, badge, kv, colors, colorText } from '../middleware/logging.js'

export async function handleMyCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id ?? 'unknown'

  myCommandLogger.debug(
    `${badge('MYCMD', 'rounded')} ${kv({
      cmd: '/mycommand',
      user: colorText(String(userId), colors.user),
    })}`
  )

  // Lógica del comando...

  await ctx.reply('Respuesta del comando', { parse_mode: 'Markdown' })
}
```

### 2. Agregar Logger Especializado (si no existe)

**Archivo**: `core/src/middleware/logging.ts`

```typescript
import { component } from '@mks2508/better-logger'
export const myCommandLogger = component('MyCommand')
```

### 3. Registrar en Bot

**Archivo**: `core/src/index.ts`

```typescript
import { handleMyCommand } from './handlers/mycommand.js'
bot.command('mycommand', handleMyCommand)
```

---

## Agregando Middleware

### 1. Crear Middleware

**Archivo**: `core/src/middleware/custom.ts`

```typescript
import type { Context, Middleware } from 'telegraf'

export function customMiddleware(): Middleware<Context> {
  return async (ctx, next) => {
    // Pre-processing
    await next()
    // Post-processing
  }
}
```

### 2. Registrar Middleware

**Archivo**: `core/src/index.ts`

```typescript
import { customMiddleware } from './middleware/custom.js'
bot.use(customMiddleware())
```

---

## Patterns

### Result Type Pattern

Railway-oriented programming para error handling sin excepciones:

```typescript
import { ok, err, type Result, botError } from './types/result.js'

function divide(a: number, b: number): Result<number> {
  if (b === 0) {
    return err(botError('INVALID_ARGS', 'Cannot divide by zero'))
  }
  return ok(a / b)
}

const result = divide(10, 2)
if (result.ok) {
  console.log(result.value) // 5
} else {
  console.error(result.error.message)
}
```

**Utilities disponibles**: `ok`, `err`, `isOk`, `isErr`, `unwrap`, `unwrapOr`, `map`, `mapErr`, `flatMap`, `tap`, `tapErr`, `match`, `collect`, `all`

### Singleton Pattern

- `BotManager` - Lifecycle y stats
- `LogStreamer` - Buffer de logs
- `InstanceManager` - Lock management
- `Config` - Cached configuration

---

## Logging System

### Usar Better Logger

```typescript
import { botLogger, kv, badge, colorText, colors } from './middleware/logging.js'

botLogger.info('Información')
botLogger.success('Operación exitosa')
botLogger.warn('Advertencia')
botLogger.error('Error', error)
```

### Crear Logger Especializado

```typescript
import { component } from '@mks2508/better-logger'

const myLogger = component('MyModule')
myLogger.info('Módulo iniciado')
```

### Formatting Avanzado

```typescript
// Key-Value formatting
botLogger.info(kv({ user: '123', action: 'start' }))

// Badge
botLogger.info(badge('CMD', 'rounded'))

// Colored text
botLogger.success(colorText('Success', colors.success))

// Duration
const { formatDuration } = await import('./middleware/logging.js')
botLogger.info(formatDuration(1234)) // "1.2s"
```

---

## Testing

### Escribiendo Tests

Usa `bun test` con sintaxis similar a Jest:

```typescript
import { describe, test, expect } from 'bun:test'

describe('Mi Módulo', () => {
  test('debe hacer algo', () => {
    const result = miFuncion()
    expect(result).toBe('expected')
  })
})
```

### Archivos de Test

- **Nombre**: `*.test.ts` o `*.spec.ts`
- **Ubicación**: Junto al archivo que testean
- **Ejemplo**: `core/src/types/result.test.ts`

### Ejecutar Tests

```bash
bun test              # Ejecutar todos
bun test --verbose    # Output detallado
bun test --watch      # Watch mode
bun test path/to/test.ts  # Test específico
```

---

## Environment Variables (Desarrollo)

### Archivo: `core/.env.example`

Variables requeridas para desarrollo:

| Variable | Descripción |
| -------- | ----------- |
| `TG_BOT_TOKEN` | Token from @BotFather |
| `TG_MODE` | `polling` o `webhook` |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` |
| `TG_DEBUG` | Habilitar debug mode |
| `TG_INSTANCE_CHECK` | Habilitar detección de instancias |

---

## Troubleshooting Development

### Typecheck Errors

```bash
# Ejecutar typecheck detallado
tsgo --traceback
```

### Tests Fallan

```bash
# Ejecutar tests con output detallado
bun test --verbose

# Ejecutar solo un archivo de test
bun test core/src/types/result.test.ts
```

### Bot No Responde

1. Verificar `TG_BOT_TOKEN` es válido
2. Chequear `/health` command
3. Verificar `TG_AUTHORIZED_USER_IDS` para control commands

---

## Quick Reference

### Comandos de Desarrollo

```bash
bun run dev           # Watch mode
bun run typecheck     # Type check
bun run lint          # Lint check
bun run format        # Format code
bun test              # Run tests
```

### Archivos Clave para Desarrollo

- `core/src/index.ts` - Entry point, command registration
- `core/src/handlers/` - Command handlers
- `core/src/middleware/` - Telegraf middleware
- `core/src/config/` - Configuration and env validation
- `core/src/utils/` - Utilities (formatters, instance-manager, etc.)

---

## ⚠️ Mejores Prácticas - CRÍTICO

### 🔴 Errores Comunes a EVITAR

#### 1. NO poner código de comandos en `index.ts`

❌ **INCORRECTO**:
```typescript
// core/src/index.ts
bot.command('mycommand', async (ctx) => {
  // ... 50 líneas de código ...
  ctx.reply('...')
})
```

✅ **CORRECTO**:
```typescript
// core/src/handlers/mycommand.ts
export async function handleMyCommand(ctx: Context): Promise<void> {
  // ...
}

// core/src/index.ts
import { handleMyCommand } from './handlers/mycommand.js'
bot.command('mycommand', handleMyCommand)
```

#### 2. NO usar `console.*` - SIEMPRE usar Better Logger

❌ **INCORRECTO**:
```typescript
console.log('Bot iniciado')
console.error('Error:', error)
```

✅ **CORRECTO**:
```typescript
import { botLogger } from './middleware/logging.js'
botLogger.info('Bot iniciado')
botLogger.error('Error:', error)
```

#### 3. NO repetir lógica de formateo - USAR helpers existentes

❌ **INCORRECTO**:
```typescript
const uptime = Math.floor(ms / 1000) + 's'
```

✅ **CORRECTO**:
```typescript
import { formatDuration } from './middleware/logging.js'
const uptime = formatDuration(ms)
```

#### 4. NO usar backticks en template strings de Markdown

❌ **INCORRECTO** (causa error de sintaxis):
```typescript
info += `User ID: \`${userId}\`\n`  // ❌ Backtick dentro de template string
```

✅ **CORRECTO**:
```typescript
const backtick = '`'
info += `User ID: ${backtick}${userId}${backtick}\n`
```

#### 5. NO olvidar type guards para propiedades opcionales de Telegraf

❌ **INCORRECTO**:
```typescript
if (chat.title) info += chat.title  // Error si chat es PrivateChat
```

✅ **CORRECTO**:
```typescript
if ('title' in chat && chat.title) info += chat.title
```

---

### ✅ Checklist ANTES de implementar funcionalidad

Antes de agregar comandos o funcionalidades:

- [ ] **Revisar handlers existentes** - `core/src/handlers/health.ts`, `control.ts`, `logs.ts`
- [ ] **Revisar utils existentes** - `core/src/utils/formatters.ts`, `telegram.ts`
- [ ] **Revisar loggers disponibles** - `packages/utils/src/logger.ts`
- [ ] **Seguir el patrón de logging**: `badge()` + `kv()` + `colorText()`
- [ ] **Usar formatters existentes**: `formatUptime()`, `formatHealthMessage()`, etc.
- [ ] **Crear handler separado** - NUNCA en `index.ts`
- [ ] **Agregar logger especializado** si es un comando nuevo
- [ ] **Type guards para propiedades opcionales** de objetos de Telegraf

---

### 📁 Estructura de Archivos

```
core/src/
├── handlers/           # ← TODOS los comandos van aquí
│   ├── health.ts      # /health, /uptime, /stats
│   ├── control.ts     # /stop, /restart, /mode
│   ├── logs.ts        # /logs
│   └── info.ts        # /getinfo
├── middleware/        # Telegraf middleware
│   ├── auth.ts
│   ├── error-handler.ts
│   ├── topics.ts
│   └── logging.ts     # Reexporta desde utils
├── utils/             # Helpers y formatters
│   ├── formatters.ts  # formatUptime, formatHealth, etc.
│   ├── telegram.ts    # formatBytes, formatMemory, etc.
│   ├── bot-manager.ts
│   └── instance-manager.ts
└── index.ts           # SOLO registro de comandos
                        # NO lógica de comandos aquí
```

---

### 🎯 Patrones de Código a SEGUIR

#### Patrón de Handler

```typescript
import type { Context } from 'telegraf'
import { xxxLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import { formatXxx } from '../utils/formatters.js'

export async function handleXxx(ctx: Context): Promise<void> {
  // 1. Logging con badge + kv + colorText
  xxxLogger.debug(
    `${badge('XXX', 'rounded')} ${kv({
      cmd: '/xxx',
      user: colorText(String(ctx.from?.id), colors.user),
    })}`
  )

  // 2. Lógica del comando
  // ...

  // 3. Formatear respuesta usando helpers
  const message = formatXxx(data)

  // 4. Responder
  await ctx.reply(message, { parse_mode: 'Markdown' })
}
```

#### Patrón de Logging

```typescript
// Debug info para tracking
xxxLogger.debug(`${badge('CMD', 'rounded')} ${kv({ cmd: '/xxx', user: id })}`)

// Info para eventos importantes
xxxLogger.info('Operación completada')

// Success para confirmaciones
xxxLogger.success('Configuración actualizada')

// Warning para situaciones anormales no-críticas
xxxLogger.warn('Valor inválido, usando default')

// Error para fallos
xxxLogger.error('Fallo al procesar:', error)
```

---

## 🧵 Topics y Organización de Grupos

El bot soporta **Forum Topics** de Telegram para mantener el chat organizado.

### Detectar Thread ID

Para obtener el Thread ID de un topic:

```typescript
import { getThreadId } from './handlers/info.js'

// En cualquier handler
const threadId = getThreadId(ctx.message)
if (threadId) {
  logger.info(`Message sent in thread ${threadId}`)
}
```

### Configuración por Topic

```typescript
// middleware/topics.ts - Ya implementado en el template
export function topicValidation() {
  return async (ctx, next) => {
    const config = getConfig()

    // Si hay un topic de control configurado, validar
    if (config.controlTopicId) {
      const threadId = getThreadId(ctx.message)

      // Comandos de control solo en el topic específico
      if (ctx.message?.text?.startsWith('/')) {
        const isControlCommand = CONTROL_COMMANDS.some(cmd =>
          ctx.message?.text?.startsWith(cmd)
        )

        if (isControlCommand && threadId !== config.controlTopicId) {
          return // Ignorar comando fuera del topic
        }
      }
    }

    return next()
  }
}
```

### Helper Function

Usa la función `getThreadId()` para detectar topics:

```typescript
/**
 * Get thread ID from a message
 * Checks multiple possible locations where thread_id can be stored
 */
function getThreadId(msg: any): number | undefined {
  if (!msg) return undefined

  // Direct thread_id property (forum topics)
  if ('thread_id' in msg && typeof msg.thread_id === 'number') {
    return msg.thread_id
  }

  // message_thread_id (alternative property)
  if ('message_thread_id' in msg && typeof msg.message_thread_id === 'number') {
    return msg.message_thread_id
  }

  // Check in reply_to_message
  if ('reply_to_message' in msg && msg.reply_to_message) {
    const replyTo = msg.reply_to_message

    if ('thread_id' in replyTo && typeof replyTo.thread_id === 'number') {
      return replyTo.thread_id
    }

    if ('message_thread_id' in replyTo && typeof replyTo.message_thread_id === 'number') {
      return replyTo.message_thread_id
    }
  }

  return undefined
}
```

### Mejores Prácticas para Topics

1. **Separa preocupaciones:**
   - Topic "General" - Chat casual
   - Topic "Control" - Solo comandos de control
   - Topic "Logs" - Streaming de logs
   - Topic "Config" - Discusiones de configuración

2. **Usa `/getinfo` en cada topic:**
   - Envia `/getinfo` dentro del topic
   - Copia el Thread ID mostrado
   - Configúralo en `.env`

3. **Valida location de comandos:**
   - Comandos de control → Solo en topic "Control"
   - Logs → Solo en topic "Logs"
   - Públicos → Cualquier topic

---

## Ver También

- [CLAUDE.md](./CLAUDE.md) - Entry point principal
- [CLAUDE.deploy.md](./CLAUDE.deploy.md) - Deployment y entornos
- [README.md](./README.md) - Quick start del proyecto
