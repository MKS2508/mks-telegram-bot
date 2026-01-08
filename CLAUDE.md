# CLAUDE.md - mks-telegram-bot

> **Template**: Monorepo para bots de Telegram con Bun, Telegraf y TypeScript
> **Versión**: 0.3.0

Template monorepo diseñado para ser usado como GitHub template repository o clonado directamente.

**Objetivo**: Template reutilizable para crear bots de Telegram con las mejores prácticas, tipado estricto y arquitectura modular.

---

## Quick Start

```bash
# Clonar o usar como template
gh repo create my-bot --template MKS2508/mks-telegram-bot

# Instalar dependencias
bun install

# Bootstrap interactivo (crea bot, grupo, topics)
bunx @mks2508/telegram-bot-manager bootstrap

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
| [docs/](./docs/) | Documentación detallada |

---

## Critical Files for Claude

When modifying this codebase, prioritize understanding:

### Core Bot (`core/`)
- `core/src/index.ts` - Bot entry point, command registration
- `core/src/config/env.ts` - Environment schema validation, multibot loading
- `core/src/handlers/` - Command handlers (health, control, logs, etc.)
- `core/src/middleware/` - Telegraf middleware (auth, error, topics)
- `core/src/utils/instance-manager.ts` - Multi-instance locking

### Local CLI Tools (`tools/`)
- `tools/commands/setup.ts` - Setup manual de entorno
- `tools/commands/doctor.ts` - Diagnóstico de configuración
- `tools/commands/status.ts` - Estado de instancias
- `tools/commands/ngrok.ts` - Túnel ngrok para webhooks

### Bot Management (External Package)

Para gestión de bots (bootstrap, configuración BotFather, multibot), usar **@mks2508/telegram-bot-manager**:

```bash
# Bootstrap completo (bot + grupo + topics)
bunx @mks2508/telegram-bot-manager bootstrap

# Listar bots desde BotFather e importar
bunx @mks2508/telegram-bot-manager bootstrap --list

# Gestión de bots configurados
bunx @mks2508/telegram-bot-manager bot list
bunx @mks2508/telegram-bot-manager bot use mybot123bot
bunx @mks2508/telegram-bot-manager bot info mybot123bot
bunx @mks2508/telegram-bot-manager bot delete mybot123bot

# Configurar bot via BotFather
bunx @mks2508/telegram-bot-manager configure commands mybot123bot
bunx @mks2508/telegram-bot-manager configure description mybot123bot
bunx @mks2508/telegram-bot-manager configure about mybot123bot
bunx @mks2508/telegram-bot-manager configure name mybot123bot

# Crear topics en grupo forum
bunx @mks2508/telegram-bot-manager topics
```

---

## Project Structure

```
mks-telegram-bot/
├── core/                    # @mks2508/telegram-bot-core (Bot principal)
│   ├── .envs/              # Configuraciones multibot
│   │   ├── {botUsername}/
│   │   │   ├── local.env
│   │   │   ├── staging.env
│   │   │   ├── production.env
│   │   │   └── metadata.json
│   │   └── .active -> {botUsername}
│   ├── src/
│   │   ├── index.ts         # Entry point
│   │   ├── config/          # Configuration & env validation (Zod)
│   │   ├── handlers/        # Command handlers
│   │   ├── middleware/      # Telegraf middleware
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utilities (instance-manager, etc.)
│   ├── logs/               # Log files (rotated)
│   ├── tmp/                # Instance lock files (.pid, .lock)
│   └── .env.example        # Template de variables
├── tools/                  # CLI tools locales
│   ├── index.ts            # CLI entry point
│   └── commands/
│       ├── setup.ts        # Setup manual interactivo
│       ├── doctor.ts       # Diagnóstico de configuración
│       ├── status.ts       # Estado de instancias
│       └── ngrok.ts        # Integración ngrok
├── docs/                   # Documentación
│   ├── getting-started.md
│   ├── environment.md
│   ├── cli-commands.md
│   ├── development.md
│   └── troubleshooting.md
├── apps/                   # Apps adicionales (futuro)
├── Dockerfile              # Multi-stage build
├── docker-compose.yml      # Containers locales
└── package.json            # Root workspace config
```

---

## Commands Reference

### Local Development Commands

```bash
# Development
bun run dev           # Hot reload (watch mode)
bun run start         # Production mode

# Quality
bun run typecheck     # Type check (tsgo - ~10x faster)
bun run lint          # Lint (oxlint)
bun run format        # Format (prettier)
bun run test          # Run tests

# Local CLI tools
bun run setup         # Setup manual de entorno
bun run setup:staging # Setup staging
bun run setup:production # Setup production
bun run doctor        # Diagnóstico de configuración
bun run ngrok         # Start ngrok tunnel
bun run cli status    # Ver instancias corriendo

# Maintenance
bun run clean:logs    # Limpiar logs y locks
bun run clean:all     # Limpiar todo
```

### Bot Management Commands (External)

```bash
# Usar @mks2508/telegram-bot-manager via bunx/npx:

# Bootstrap
bunx @mks2508/telegram-bot-manager bootstrap          # Interactivo completo
bunx @mks2508/telegram-bot-manager bootstrap --list   # Listar e importar bots
bunx @mks2508/telegram-bot-manager bootstrap --auto   # Auto-generado sin prompts

# Bot management
bunx @mks2508/telegram-bot-manager bot list           # Listar bots configurados
bunx @mks2508/telegram-bot-manager bot use <username> # Cambiar bot activo
bunx @mks2508/telegram-bot-manager bot info <username># Info de bot
bunx @mks2508/telegram-bot-manager bot delete <user>  # Eliminar bot
bunx @mks2508/telegram-bot-manager bot migrate        # Migrar .env antiguos

# Configure via BotFather
bunx @mks2508/telegram-bot-manager configure commands <user>
bunx @mks2508/telegram-bot-manager configure description <user>
bunx @mks2508/telegram-bot-manager configure about <user>
bunx @mks2508/telegram-bot-manager configure name <user>

# Topics
bunx @mks2508/telegram-bot-manager topics
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

### Optional Variables

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `TG_ENV` | `local` | Environment: local/staging/production |
| `TG_INSTANCE_NAME` | `mks-bot` | Unique instance name for locking |
| `TG_INSTANCE_CHECK` | `true` | Enable instance conflict detection |
| `TG_AUTHORIZED_USER_IDS` | - | Comma-separated user IDs for control commands |
| `TG_CONTROL_CHAT_ID` | - | Chat ID for control commands |
| `TG_CONTROL_TOPIC_ID` | - | Topic ID for control commands |
| `TG_LOG_CHAT_ID` | - | Chat ID for log streaming |
| `TG_LOG_TOPIC_ID` | - | Topic ID for log streaming |

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
| **@mks2508/telegram-bot-manager** | Bot management (external) | 0.1.1+ |

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
   │Middleware│    │   Handlers   │  │   Config    │
   │ • auth   │    │ • health     │  │ • env.ts    │
   │ • error  │    │ • control    │  │ • Zod       │
   │ • topics │    │ • logs       │  │ validation  │
   └──────────┘    └──────────────┘  └─────────────┘
        │                                │
        └────────────┬───────────────────┘
                     │
            ┌────────▼────────┐
            │ InstanceManager │
            │  • acquireLock  │
            │  • releaseLock  │
            │  • PID files    │
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
| `/getinfo` | inline | Get User ID, Chat ID, Topic ID |
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

- [ ] `bun run typecheck` → 0 errors
- [ ] `bun run lint` → 0 warnings, 0 errors
- [ ] `bun test` → all tests pass (if tests exist)

### Code Style

- TypeScript strict mode enabled
- `noUncheckedIndexedAccess: true` - arrays need undefined checks
- Semi: false, singleQuote: true
- No console.* - use structured logger

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

## Relationship with @mks2508/telegram-bot-manager

Este template usa **@mks2508/telegram-bot-manager** como paquete externo para:

- **Bootstrap**: Crear bots via BotFather automáticamente
- **Group Management**: Crear grupos/forums con topics
- **Multibot Management**: Gestionar múltiples bots configurados
- **BotFather Configuration**: Configurar commands, description, about, name

El paquete se usa via `bunx` (no se instala como dependencia):

```bash
bunx @mks2508/telegram-bot-manager <command>
```

**Documentación del paquete**: https://github.com/MKS2508/telegram-bot-manager

---

## License

MIT
