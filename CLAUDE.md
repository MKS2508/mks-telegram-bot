# CLAUDE.md - mks-telegram-bot

> **Template**: Monorepo para bots de Telegram con Bun, Telegraf y TypeScript
> **Versión**: 0.2.0

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
bun run bootstrap

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

### CLAUDE.dev.md

Ver [CLAUDE.dev.md](./CLAUDE.dev.md) para:
- Development standards y code style
- Cómo agregar commands y middleware
- Testing patterns
- Result type pattern y Singleton pattern
- Better Logger usage

### CLAUDE.deploy.md

Ver [CLAUDE.deploy.md](./CLAUDE.deploy.md) para:
- Multi-environment (local, staging, production)
- Multi-instance management
- Docker deployment
- ngrok integration
- VPS deployment guide

---

## Critical Files for Claude

When modifying this codebase, prioritize understanding:

### Core Bot
- `core/src/index.ts` - Bot entry point, command registration
- `core/src/config/env.ts` - Environment schema validation, **multibot loading**
- `core/src/utils/instance-manager.ts` - Multi-instance locking
- `packages/utils/src/` - Shared utilities (logger, result)

### Multibot System ✨
- `packages/bootstrapper/src/` - **Bootstrapper completo con GramJS**
  - `client.ts` - GramJS client wrapper para Telegram MTProto
  - `bot-father.ts` - BotFather automation (listBots, createBot, getBotInfo)
  - `group-manager.ts` - Grupo/Forum creation automation
  - `topic-manager.ts` - Topics creation automation
  - `env-manager.ts` - **Multibot .env management**
  - `bootstrap-state.ts` - Interactive prompts para bootstrap
- `tools/commands/bootstrap.ts` - **Bootstrap interactivo CLI**
- `tools/commands/bot.ts` - **Bot management CLI**

---

## Session Context Template

When starting a new session, include:
- **User's goal**: developing vs deploying vs extending
- **Current environment**: local/staging/production
- **Any errors or issues encountered**: Paste error messages
- **Multibot context**: Working on single bot or multibot system

---

## Monorepo Structure

```
mks-telegram-bot/
├── core/                    # @mks2508/telegram-bot-core
│   ├── .envs/              # ✨ Configuraciones multibot
│   │   ├── {botUsername}/
│   │   │   ├── local.env
│   │   │   ├── staging.env
│   │   │   ├── production.env
│   │   │   └── metadata.json
│   │   └── .active -> {botUsername}
│   ├── .env.example         # Template de variables de entorno
│   ├── tmp/                 # Instance lock files
│   └── src/                # Bot source code
├── packages/               # Shared code
│   ├── bootstrapper/       # ✨ Bootstrapper con GramJS
│   │   └── src/
│   │       ├── client.ts
│   │       ├── bot-father.ts
│   │       ├── group-manager.ts
│   │       ├── topic-manager.ts
│   │       ├── env-manager.ts
│   │       └── bootstrap-state.ts
│   └── utils/              # @mks2508/telegram-bot-utils
│       └── src/
│           ├── logger.ts
│           └── result.ts
├── tools/                  # CLI tools
│   └── commands/
│       ├── bootstrap.ts     # ✨ Bootstrap interactivo
│       ├── bot.ts          # ✨ Gestión multibot
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

### Bootstrap Commands ✨
```bash
# Bootstrap interactivo completo
bun run bootstrap

# Listar bots desde BotFather
bun run bootstrap --list

# Bot específico
bun run bootstrap --bot mybot123bot

# Reutilizar sin prompts
bun run bootstrap --reuse

# Forzar recreación
bun run bootstrap --force

# Skip topics creation
bun run bootstrap --skip-topics
```

### Multibot Management Commands ✨
```bash
# Listar bots configurados
bun run bot list

# Establecer bot activo
bun run bot use mybot123bot

# Info detallada de bot
bun run bot info mybot123bot

# Eliminar configuración de bot
bun run bot delete mybot123bot

# Migrar .env antiguos a nueva estructura
bun run bot migrate
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

# CLI tools
bun run status        # Show running instances
bun run ngrok         # Start ngrok tunnel
bun run doctor        # Diagnóstico de configuración
bun run setup         # Setup manual de entorno
```

---

## Environment Variables

### Multibot Structure ✨

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

### Selección de Bot Activo

Hay tres formas de seleccionar el bot activo:

1. **Vía symlink .active**:
```bash
bun run bot use mybot123bot
```

2. **Vía variable de entorno**:
```bash
TG_BOT=mybot123bot bun run dev
```

3. **Automático**: El bot configurado más recientemente

### Multi-Environment Support

Cada bot puede tener múltiples entornos:

| Archivo | Uso |
| ------- | --- |
| `core/.envs/{bot}/local.env` | Desarrollo local (polling mode) |
| `core/.envs/{bot}/staging.env` | Testing con bot de test |
| `core/.envs/{bot}/production.env` | Producción con bot real |

La variable `TG_ENV` (default: `local`) determina cuál archivo cargar.

### Legacy Environment Support

Para backwards compatibility, el sistema también soporta la estructura antigua:

| Archivo | Uso |
| ------- | --- |
| `core/.env.local` | Desarrollo local (polling mode) |
| `core/.env.staging` | Testing con bot de test |
| `core/.env.production` | Producción con bot real |

Usa `bun run bot migrate` para migrar a la nueva estructura.

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
| **GramJS** | MTProto API (BotFather automation) | 2.26+ |
| **TypeScript** | Language | 5.9+ |
| **tsgo** | Type-checking | native-preview |
| **Zod** | Schema validation | 3.24+ |
| **Better Logger** | Logging | 4.0.0 |
| **@mks2508/no-throw** | Result type | 0.1.0 |
| **oxlint** | Linting | latest |
| **prettier** | Formatting | 3.4+ |
| **commander** | CLI framework | 14.0+ |
| **@inquirer/prompts** | Interactive CLI prompts | latest |
| **ora** | CLI spinners | latest |

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

### Multibot Architecture ✨

```
┌─────────────────────────────────────────────────────────────┐
│                  Multibot System                            │
├─────────────────────────────────────────────────────────────┤
│  CLI (tools/commands/)                                       │
│  ├── bootstrap.ts  →  BotFather automation (packages/    │
│  └── bot.ts        →  EnvManager (multibot CRUD)         │
├─────────────────────────────────────────────────────────────┤
│  Bootstrap (packages/bootstrapper/)                          │
│  ├── client.ts       →  GramJS MTProto client              │
│  ├── bot-father.ts   →  BotFather /mybots, /newbot         │
│  ├── group-manager.ts→  Create supergroups with forums     │
│  ├── topic-manager.ts→  Create forum topics                 │
│  ├── env-manager.ts  →  .envs/{bot}/{env}.env management   │
│  └── bootstrap-state.ts → Interactive prompts (@inquirer)  │
├─────────────────────────────────────────────────────────────┤
│  Environment Loading (core/src/config/env.ts)                │
│  ├── TG_BOT env var →  Bot selection                     │
│  ├── .active symlink  →  Bot selection                     │
│  └── loadEnvConfig()   →  Loads .envs/{bot}/{env}.env     │
└─────────────────────────────────────────────────────────────┘
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
- [ ] No `console.*` (use Better Logger)

### Code Style

- TypeScript strict mode enabled
- `noUncheckedIndexedAccess: true` - arrays need undefined checks
- Semi: false, singleQuote: true
- Result type pattern para error handling

---

## Documentation Web

Ver [docs/](./docs/) para documentación completa (futuro MDX site con Astro/Starlight).

---

## Future Apps

El directorio `apps/` está preparado para:
- `apps/example/` - Ejemplo de bot completo
- `apps/docs/` - Documentación interactiva
- `apps/cli/` - CLI extendida para gestión

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
bun run status

# Iniciar en entorno específico
TG_ENV=staging bun run start
```

---

## Multibot System Details

### Bootstrap Workflow

1. **API Credentials**: Solicita API ID y Hash de https://my.telegram.org
2. **Bot Selection**:
   - Lista bots desde BotFather (/mybots)
   - Pregunta si crear nuevo o reutilizar existente
   - Genera nombres aleatorios si es necesario
3. **Group Selection**:
   - Lista grupos existentes (TODO: implementar fetch)
   - Pregunta si crear nuevo o reutilizar existente
4. **Topics Selection**:
   - Lista topics existentes
   - Pregunta si crear nuevos o reutilizar existentes
5. **Configuration**:
   - Guarda en `.envs/{bot}/{environment}.env`
   - Actualiza symlink `.active`

### EnvManager API

```typescript
import { EnvManager } from '@mks2508/telegram-bot-bootstrapper'

const envManager = new EnvManager()

// List all configured bots
const bots = envManager.listBots()

// Get/set active bot
const active = envManager.getActiveBot()
await envManager.setActiveBot('mybot123bot')

// CRUD operations
await envManager.createEnv('mybot123bot', 'local', config)
await envManager.readEnv('mybot123bot', 'local')
await envManager.updateEnv('mybot123bot', 'local', updates)
await envManager.deleteBot('mybot123bot')

// Metadata
const metadata = envManager.getMetadata('mybot123bot')
await envManager.updateMetadata('mybot123bot', { name: 'My Bot' })

// Migration
const result = await envManager.migrateOldEnvs()
```

### BotFatherManager API

```typescript
import { BotFatherManager } from '@mks2508/telegram-bot-bootstrapper'

const botFather = new BotFatherManager(client)

// List bots from BotFather
const { success, bots } = await botFather.listBots()

// Create new bot
const { success, botToken, botUsername } = await botFather.createBot({
  botName: 'My Bot',
  botUsername: 'mybot123bot'
})

// Get bot info
const { success, bot } = await botFather.getBotInfo('mybot123bot')

// Check username availability
const available = await botFather.checkUsernameAvailable('mybot123bot')
```

---

## License

MIT
