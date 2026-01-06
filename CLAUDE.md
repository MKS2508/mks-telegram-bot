# CLAUDE.md - mks-telegram-bot

Template monorepo para bots de Telegram con Bun, Telegraf y TypeScript.

## Project Overview

Monorepo diseñado para ser usado como:
- `bun create mks2508/mks-telegram-bot`
- GitHub template repository

**Objetivo**: Template reutilizable para crear bots de Telegram con las mejores
prácticas, tipado estricto y arquitectura modular.

## Monorepo Structure

```
mks-telegram-bot/
├── package.json          # Workspace root
├── tsconfig.json         # Shared TypeScript config (strict)
├── .oxlintrc.json        # Linting (typescript + import plugins)
├── .prettierrc           # Formatting (semi:false, singleQuote:true)
├── bun.lock              # Single lockfile
├── core/                 # @mks2508/telegram-bot-core
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts      # Entry point
│       ├── config/       # Configuration & env validation
│       ├── types/        # TypeScript types & Result pattern
│       ├── middleware/   # Telegraf middleware
│       ├── handlers/     # Command handlers
│       └── utils/        # Utilities
└── apps/                 # Future: docs, examples
    └── .gitkeep
```

## Commands

### Root Commands (run from workspace root)

```bash
bun install           # Install all workspace dependencies
bun run dev           # Start bot with hot reload (watch mode)
bun run start         # Start bot in production mode
bun run typecheck     # Type-check with tsgo (~10x faster than tsc)
bun run typecheck:core # Type-check core only
bun run lint          # Run oxlint
bun run lint:fix      # Fix linting issues
bun run format        # Format with prettier
bun run format:check  # Check formatting
bun run clean         # Remove all node_modules
```

### Core Commands (from core/)

```bash
bun run dev           # Start with --watch
bun run start         # Production start
bun run typecheck     # Type-check core only
```

## Environment Variables

Crear `.env` en `core/` (copiar de `core/.env.example`).

### Required Variables

| Variable       | Type   | Description                       |
| -------------- | ------ | --------------------------------- |
| `TG_BOT_TOKEN` | string | Bot token from @BotFather         |
| `TG_MODE`      | enum   | `polling` or `webhook`            |

### Webhook Variables (required if TG_MODE=webhook)

| Variable            | Type   | Validation | Description                |
| ------------------- | ------ | ---------- | -------------------------- |
| `TG_WEBHOOK_URL`    | string | URL        | Public HTTPS webhook URL   |
| `TG_WEBHOOK_SECRET` | string | min(16)    | Secret token for validation |

### Log Streaming Variables (optional)

| Variable         | Type   | Description                    |
| ---------------- | ------ | ------------------------------ |
| `TG_LOG_CHAT_ID` | string | Chat ID for log streaming      |
| `TG_LOG_TOPIC_ID`| number | Topic ID (if using forum topics) |

### Control Commands Variables (optional)

| Variable             | Type   | Description                    |
| -------------------- | ------ | ------------------------------ |
| `TG_CONTROL_CHAT_ID` | string | Chat ID for control commands   |
| `TG_CONTROL_TOPIC_ID`| number | Topic ID for control commands  |

### Authorization Variables (optional)

| Variable                 | Type   | Description                           |
| ------------------------ | ------ | ------------------------------------- |
| `TG_AUTHORIZED_USER_IDS` | string | Comma-separated user IDs (e.g., "123,456") |

### Configuration Variables (optional with defaults)

| Variable           | Type    | Default | Range     | Description          |
| ------------------ | ------- | ------- | --------- | -------------------- |
| `LOG_LEVEL`        | enum    | `info`  | debug/info/warn/error | Log verbosity |
| `TG_DEBUG`         | boolean | `false` | -         | Enable debug mode    |
| `TG_RATE_LIMIT`    | number  | `60`    | 1-120     | Rate limit per minute |
| `TG_TIMEOUT`       | number  | `5000`  | min 1000  | Command response timeout (ms) |
| `TG_MAX_RETRIES`   | number  | `3`     | 1-10      | Max retry attempts   |
| `TG_COMMAND_PREFIX`| string  | `/`     | max 10    | Command prefix       |

### Example .env

```bash
# Required
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TG_MODE=polling

# Webhook (if TG_MODE=webhook)
# TG_WEBHOOK_URL=https://your-domain.com/webhook
# TG_WEBHOOK_SECRET=your_secret_min_16_chars

# Log streaming
# TG_LOG_CHAT_ID=-1001234567890
# TG_LOG_TOPIC_ID=123

# Control commands
# TG_CONTROL_CHAT_ID=-1001234567890
# TG_CONTROL_TOPIC_ID=124
# TG_AUTHORIZED_USER_IDS=123456789,987654321

# Config
LOG_LEVEL=info
```

## Technology Stack

| Tool                | Purpose             | Version    |
| ------------------- | ------------------- | ---------- |
| **Bun**             | Runtime & packages  | 1.3+       |
| **TypeScript**      | Language            | 5.9+       |
| **tsgo**            | Type-checking       | native-preview |
| **Telegraf**        | Telegram Bot API    | 4.16+      |
| **Zod**             | Schema validation   | 3.24+      |
| **Better Logger**   | Logging             | 3.1.0      |
| **oxlint**          | Linting             | latest     |
| **prettier**        | Formatting          | 3.4+       |

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram API (Telegraf)                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐    ┌───────▼───────┐  ┌──────▼──────┐
   │Middleware│    │   Handlers   │  │ BotManager  │
   │          │    │              │  │             │
   │ • auth   │    │ • health     │  │ • status    │
   │ • error  │    │ • control    │  │ • stats     │
   │ • topics │    │ • logs       │  │ • lifecycle │
   └──────────┘    └──────────────┘  └─────────────┘
                          │
                   ┌──────▼──────┐
                   │   Config    │
                   │ • getConfig │
                   │ • Zod valid │
                   └─────────────┘
```

### Data Flow

```
Update → ErrorHandler → TopicValidation → Auth → Handler → BotManager → Response
```

### Key Files

| File                          | Purpose                           |
| ----------------------------- | --------------------------------- |
| `core/src/index.ts`           | Bot entry point, command registration |
| `core/src/config/env.ts`      | Zod schema for env validation     |
| `core/src/config/index.ts`    | Config singleton & helpers        |
| `core/src/types/result.ts`    | Result<T,E> pattern implementation |
| `core/src/types/constants.ts` | Timeouts, limits, env keys        |
| `core/src/utils/bot-manager.ts` | Bot lifecycle & stats           |
| `core/src/middleware/logging.ts` | Better Logger setup            |

## Patterns

### Result Type Pattern

Railway-oriented programming para error handling predecible:

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

**Available utilities**: `ok`, `err`, `isOk`, `isErr`, `unwrap`, `unwrapOr`,
`map`, `mapErr`, `flatMap`, `tap`, `tapErr`, `match`, `collect`, `all`

### Singleton Pattern

- `BotManager` - Lifecycle y stats
- `LogStreamer` - Buffer de logs
- `Config` - Cached config

### Middleware Pattern

Telegraf middleware para auth, errors, topics:

```typescript
export function auth(): Middleware<Context> {
  return async (ctx, next) => {
    const authResult = botManager.authorize(ctx.from.id)
    if (!authResult.ok) {
      await ctx.reply(`⛔ ${authResult.error.message}`)
      return
    }
    return next()
  }
}
```

## Constants & Limits

### Timeouts (ms)

| Constant           | Value  | Description              |
| ------------------ | ------ | ------------------------ |
| `STARTUP`          | 30000  | Bot startup timeout      |
| `STOP`             | 10000  | Graceful stop timeout    |
| `COMMAND_RESPONSE` | 5000   | Command response timeout |
| `WEBHOOK_SETUP`    | 10000  | Webhook setup timeout    |
| `LOG_BUFFER_FLUSH` | 5000   | Log buffer flush timeout |
| `POLLING_TIMEOUT`  | 20000  | Polling timeout          |

### Limits

| Constant              | Value | Description              |
| --------------------- | ----- | ------------------------ |
| `LOG_BUFFER_SIZE`     | 10    | Max buffered logs        |
| `MAX_MESSAGE_LENGTH`  | 4096  | Telegram message limit   |
| `MAX_CAPTION_LENGTH`  | 1024  | Telegram caption limit   |
| `MAX_RETRIES`         | 3     | Default retry attempts   |
| `RATE_LIMIT_PER_MIN`  | 60    | Default rate limit       |
| `MAX_WEBHOOK_CONNS`   | 40    | Max webhook connections  |

## Bot Commands

### Public Commands

| Command   | Handler        | Description                |
| --------- | -------------- | -------------------------- |
| `/start`  | inline         | Welcome message            |
| `/health` | handleHealth   | Bot health status          |
| `/uptime` | handleUptime   | Uptime information         |
| `/stats`  | handleStats    | Bot statistics             |
| `/logs`   | handleLogs     | Log streaming status       |

### Control Commands (requires auth)

| Command   | Handler        | Description                |
| --------- | -------------- | -------------------------- |
| `/stop`   | handleStop     | Graceful shutdown          |
| `/restart`| handleRestart  | Restart with stats reset   |
| `/mode`   | handleMode     | Switch polling/webhook     |
| `/webhook`| handleWebhook  | Show webhook config        |

## Development Standards

### Before Commit

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes (warnings OK, no errors)
- [ ] `bun run format:check` passes
- [ ] No `console.log` (use Better Logger)

### Code Style

- TypeScript strict mode enabled
- `noUncheckedIndexedAccess: true` - arrays need undefined checks
- Semi: false, singleQuote: true
- No React plugin (pure Node.js bot)

### Logger Usage

```typescript
import { botLogger, kv, badge, colorText, colors } from './middleware/logging.js'

botLogger.info(`${badge('CMD')} ${kv({ user: ctx.from.id })}`)
botLogger.success(colorText('Operation completed', colors.success))
botLogger.error('Failed:', error)
```

## Extending the Bot

### Adding a New Command

1. Create handler in `core/src/handlers/`:

```typescript
// core/src/handlers/custom.ts
import type { Context } from 'telegraf'

export async function handleCustom(ctx: Context): Promise<void> {
  await ctx.reply('Custom response')
}
```

2. Register in `core/src/index.ts`:

```typescript
import { handleCustom } from './handlers/custom.js'
bot.command('custom', handleCustom)
```

### Adding Middleware

```typescript
// core/src/middleware/custom.ts
import type { Context, Middleware } from 'telegraf'

export function customMiddleware(): Middleware<Context> {
  return async (ctx, next) => {
    // Pre-processing
    await next()
    // Post-processing
  }
}
```

## Troubleshooting

### Bot doesn't respond

1. Check `TG_BOT_TOKEN` is valid
2. Verify bot is running (`/health`)
3. Check `TG_AUTHORIZED_USER_IDS` for control commands

### Webhook not working

1. Verify `TG_WEBHOOK_URL` is HTTPS and publicly accessible
2. Check `TG_WEBHOOK_SECRET` matches (min 16 chars)
3. Verify firewall allows incoming connections

### Logs not streaming

1. Check `TG_LOG_CHAT_ID` is set
2. Verify bot has permission to send messages
3. Check `TG_LOG_TOPIC_ID` matches topic (if using forums)

## Future Apps

El directorio `apps/` está preparado para:
- `apps/docs/` - Documentación interactiva
- `apps/example/` - Ejemplos de uso
- `apps/cli/` - CLI para gestión del bot
