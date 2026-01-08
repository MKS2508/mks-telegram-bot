# CLAUDE.md - mks-telegram-bot

> **Template**: Monorepo para bots de Telegram con Bun, Telegraf y TypeScript
> **Versión**: 0.3.0

Template monorepo diseñado para ser usado como `bun create mks2508/mks-telegram-bot` o como GitHub template repository.

**Objetivo**: Template reutilizable para crear bots de Telegram con las mejores prácticas, tipado estricto y arquitectura modular.

---

## Quick Start

```bash
# Clonar o usar como template
bun create mks2508/mks-telegram-bot my-bot

# Instalar dependencias
bun install

# Bootstrap interactivo (crea bot, grupo, topics)
npx @mks2508/telegram-bot-manager bootstrap

# Desarrollo
bun run dev
```

---

## Contextos Especializados

Este template tiene contextos separados por dominio:

| Archivo | Propósito |
| ------- | --------- |
| [CLAUDE.dev.md](./CLAUDE.dev.md) | Desarrollo, patterns, testing |
| [CLAUDE.deploy.md](./CLAUDE.deploy.md) | Deployment, Docker, entornos |
| [docs/](./docs/) | Documentación web (MDX, futuro) |

---

## Critical Files for Claude

When modifying this codebase, prioritize understanding:

### Core Bot
- `core/src/index.ts` - Bot entry point, command registration
- `core/src/config/env.ts` - Environment schema validation, multibot loading
- `core/src/utils/instance-manager.ts` - Multi-instance locking

### Tools (Local CLI)
- `tools/commands/setup.ts` - Setup manual de entorno
- `tools/commands/doctor.ts` - Diagnóstico de configuración
- `tools/commands/status.ts` - Estado de instancias
- `tools/commands/ngrok.ts` - Túnel ngrok para webhooks

### Bot Management (External)
Para gestión de bots, usa `@mks2508/telegram-bot-manager`:
```bash
npx @mks2508/telegram-bot-manager bootstrap  # Crear bot, grupo, topics
npx @mks2508/telegram-bot-manager bot list   # Listar bots configurados
npx @mks2508/telegram-bot-manager bot use X  # Cambiar bot activo
```

---

## Monorepo Structure

```
mks-telegram-bot/
├── core/                    # @mks2508/telegram-bot-core
│   ├── .envs/              # Configuraciones multibot
│   │   ├── {botUsername}/
│   │   │   ├── local.env
│   │   │   ├── staging.env
│   │   │   ├── production.env
│   │   │   └── metadata.json
│   │   └── .active -> {botUsername}
│   ├── .env.example         # Template de variables de entorno
│   ├── tmp/                 # Instance lock files
│   └── src/                # Bot source code
├── tools/                  # CLI tools locales
│   └── commands/
│       ├── setup.ts         # Setup manual
│       ├── doctor.ts        # Diagnostics
│       ├── status.ts        # Instance status
│       └── ngrok.ts         # ngrok integration
├── apps/                   # Future: examples, docs
├── docs/                   # Future MDX site
├── Dockerfile              # Multi-stage build
└── docker-compose.yml      # Local dev containers
```

---

## Commands

### Bot Management (via npx)
```bash
# Bootstrap interactivo completo
npx @mks2508/telegram-bot-manager bootstrap

# Listar bots desde BotFather
npx @mks2508/telegram-bot-manager bootstrap --list

# Gestión de bots configurados
npx @mks2508/telegram-bot-manager bot list
npx @mks2508/telegram-bot-manager bot use mybot123bot
npx @mks2508/telegram-bot-manager bot info mybot123bot

# Configurar bot via BotFather
npx @mks2508/telegram-bot-manager configure commands mybot123bot
```

### Development Commands
```bash
# Development
bun run dev           # Hot reload (watch mode)
bun run start         # Production mode

# Quality
bun run typecheck     # Type check (tsgo ~10x faster)
bun run lint          # Lint (oxlint)
bun run format        # Format (prettier)

# Local CLI tools
bun run setup         # Setup manual de entorno
bun run doctor        # Diagnóstico de configuración
bun run ngrok         # Start ngrok tunnel
```

---

## Environment Variables

### Multibot Structure

El proyecto soporta **gestión multibot** con estructura `.envs/`:

```
core/.envs/
├── {botUsername}/
│   ├── local.env       # Configuración local del bot
│   ├── staging.env     # Configuración staging del bot
│   ├── production.env  # Configuración production del bot
│   └── metadata.json   # Metadatos del bot
└── .active -> {botUsername}  # Symlink al bot activo
```

### Required Variables

| Variable | Tipo | Description |
| -------- | ---- | ----------- |
| `TG_BOT_TOKEN` | string | Bot token from @BotFather |
| `TG_MODE` | enum | `polling` or `webhook` |

### Instance Detection Variables

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `TG_ENV` | `local` | Environment: local/staging/production |
| `TG_INSTANCE_NAME` | `mks-bot` | Unique instance name for locking |
| `TG_INSTANCE_CHECK` | `true` | Enable instance conflict detection |

---

## Technology Stack

| Tool | Purpose | Version |
| ---- | ------- | ------- |
| **Bun** | Runtime & package manager | 1.3+ |
| **Telegraf** | Telegram Bot API | 4.16+ |
| **TypeScript** | Language | 5.9+ |
| **tsgo** | Type-checking | native-preview |
| **Zod** | Schema validation | 3.24+ |
| **oxlint** | Linting | latest |
| **prettier** | Formatting | 3.4+ |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram API (Telegraf)                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐    ┌───────▼───────┐  ┌──────▼──────┐
   │Middleware│    │   Handlers   │  │ BotManager  │
   │ • auth   │    │ • health     │  │ InstanceMgr │
   │ • error  │    │ • control    │  │ • stats     │
   │ • topics │    │ • logs       │  │ • lifecycle │
   └──────────┘    └──────────────┘  └─────────────┘
        │                                │
        └────────────┬───────────────────┘
                     │
            ┌────────▼────────┐
            │ InstanceManager │
            │  • acquireLock  │
            │  • releaseLock  │
            └─────────────────┘
```

---

## Bot Commands

### Public Commands

| Command | Handler | Description |
| ------- | ------- | ----------- |
| `/start` | inline | Welcome message |
| `/health` | handleHealth | Bot health status |
| `/uptime` | handleUptime | Uptime information |
| `/stats` | handleStats | Bot statistics |
| `/logs` | handleLogs | Log streaming status |

### Control Commands (requires auth)

| Command | Handler | Description |
| ------- | ------- | ----------- |
| `/stop` | handleStop | Graceful shutdown |
| `/restart` | handleRestart | Restart with stats reset |
| `/mode` | handleMode | Switch polling/webhook |
| `/webhook` | handleWebhook | Show webhook config |

---

## Development Workflow

### Before Commit

- [ ] `bun run typecheck` → 0 errores
- [ ] `bun run lint` → 0 warnings, 0 errors
- [ ] `bun test` → all tests pass (if tests exist)

### Code Style

- TypeScript strict mode enabled
- `noUncheckedIndexedAccess: true` - arrays need undefined checks
- Semi: false, singleQuote: true

---

## Deployment

### Docker

```bash
# Build image
docker build -t mks-telegram-bot .

# Run with docker-compose
docker-compose up bot-production
```

### Multi-Instance

El template soporta múltiples instancias simultáneas con detección de conflictos:

```bash
# Ver instancias corriendo
bun run cli status

# Iniciar en entorno específico
TG_ENV=staging bun run start
```

---

## Using @mks2508/telegram-bot-manager

Para automatización avanzada de BotFather, usa el paquete externo:

```typescript
import {
  BotFatherManager,
  GroupManager,
  EnvManager,
} from '@mks2508/telegram-bot-manager'

// Ver docs: https://github.com/MKS2508/telegram-bot-manager
```

---

## License

MIT
