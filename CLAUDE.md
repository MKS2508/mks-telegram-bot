# CLAUDE.md - mks-telegram-bot

> **Template**: Monorepo para bots de Telegram con Bun, Telegraf y TypeScript
> **Versión**: 0.1.0

Template monorepo diseñado para ser usado como `bun create mks2508/mks-telegram-bot` o como GitHub template repository.

**Objetivo**: Template reutilizable para crear bots de Telegram con las mejores prácticas, tipado estricto y arquitectura modular.

---

## Quick Start

```bash
# Clonar o usar como template
bun create mks2508/mks-telegram-bot my-bot

# Instalar dependencias
bun install

# Configurar variables de entorno
cp core/.env.example core/.env

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

- `core/src/index.ts` - Bot entry point, command registration
- `core/src/config/env.ts` - Environment schema validation
- `core/src/utils/instance-manager.ts` - Multi-instance locking
- `packages/utils/src/` - Shared utilities (logger, result)

---

## Session Context Template

When starting a new session, include:
- **User's goal**: developing vs deploying vs extending
- **Current environment**: local/staging/production
- **Any errors or issues encountered**: Paste error messages

---

## Monorepo Structure

```
mks-telegram-bot/
├── core/                 # @mks2508/telegram-bot-core
│   ├── .env.local       # Local development
│   ├── .env.staging     # Staging environment
│   ├── .env.production  # Production environment
│   ├── tmp/             # Instance lock files
│   └── src/            # Bot source code
├── packages/            # Shared code
│   └── utils/          # @mks2508/telegram-bot-utils
├── tools/               # CLI tools
│   └── commands/       # ngrok, status
├── apps/               # Future: examples, docs
├── docs/               # Future MDX site
├── Dockerfile          # Multi-stage build
└── docker-compose.yml  # Local dev containers
```

---

## Commands

```bash
# Development
bun run dev           # Hot reload (watch mode)
bun run start         # Production mode

# CLI tools
bun run status        # Show running instances
bun run ngrok         # Start ngrok tunnel

# Quality
bun run typecheck     # Type check (tsgo ~10x faster)
bun run lint          # Lint (oxlint)
bun run format        # Format (prettier)
```

---

## Environment Variables

### Multi-Environment Support

El proyecto soporta múltiples entornos con archivos `.env` separados:

| Archivo | Uso |
| ------- | --- |
| `core/.env.local` | Desarrollo local (polling mode) |
| `core/.env.staging` | Testing con bot de test |
| `core/.env.production` | Producción con bot real |

La variable `TG_ENV` (default: `local`) determina cuál archivo cargar.

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
| **Better Logger** | Logging | 4.0.0 |
| **@mks2508/no-throw** | Result type | 0.1.0 |
| **oxlint** | Linting | latest |
| **prettier** | Formatting | 3.4+ |
| **commander** | CLI framework | 14.0+ |

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

## License

MIT
