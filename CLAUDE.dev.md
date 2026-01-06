# CLAUDE.dev - Guía de Desarrollo

> **Parte de**: [CLAUDE.md](./CLAUDE.md) | Ver también: [CLAUDE.deploy.md](./CLAUDE.deploy.md)

Guía de desarrollo para extender y modificar el bot template.

**Documentación relacionada**:
- [docs/development/setup.mdx](./docs/development/setup.mdx)
- [docs/development/patterns.mdx](./docs/development/patterns.mdx)

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

export async function handleMyCommand(ctx: Context): Promise<void> {
  await ctx.reply('Respuesta del comando')
}
```

### 2. Registrar en Bot

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
- `packages/utils/src/` - Shared utilities

---

## Ver También

- [CLAUDE.md](./CLAUDE.md) - Entry point principal
- [CLAUDE.deploy.md](./CLAUDE.deploy.md) - Deployment y entornos
- [README.md](./README.md) - Quick start del proyecto
