# mks-telegram-bot

> Template monorepo para bots de Telegram con Bun, Telegraf y TypeScript

Template listo para producción con soporte multi-entorno, multi-instancia, y las mejores prácticas de desarrollo.

## Quick Start (5 min)

### 1. Crear el Bot

Habla con [@BotFather](https://t.me/BotFather) en Telegram:

```
/newbot
→ Nombre: MyBot
→ Username: my_awesome_bot
→ Copia el token (ej: 123456:ABC-DEF1234...)
```

### 2. Instalar y Configurar

```bash
# Clonar/fork el template
git clone <tu-repo>
cd mks-telegram-bot

# Instalar dependencias
bun install

# Setup interactivo (crea .env.local)
bun run setup
```

El comando `setup` te preguntará:
- Bot token (pega el token de @BotFather)
- Modo (polling para desarrollo)
- Chat IDs opcionales

### 3. Arrancar en Desarrollo

```bash
bun run dev
```

### 4. Probar

Envía `/start` o `/health` a tu bot en Telegram.

## Comandos CLI

| Comando | Descripción |
| ------- | ----------- |
| `bun run setup` | Configuración interactiva de entorno |
| `bun run setup:staging` | Setup para entorno staging |
| `bun run setup:production` | Setup para producción |
| `bun run doctor` | Diagnóstico de configuración |
| `bun run cli status` | Ver instancias corriendo |
| `bun run ngrok` | ngrok con webhook auto-config |

## Scripts de Desarrollo

| Script | Descripción |
| ------ | ----------- |
| `bun run dev` | Hot reload (development) |
| `bun run start` | Production start |
| `bun run build` | Typecheck + lint |
| `bun run test` | Ejecutar tests |
| `bun run typecheck` | Type-check con tsgo |
| `bun run lint` | Lint con oxlint |

## Documentación

| Documento | Descripción |
| --------- | ----------- |
| [Getting Started](./docs/getting-started.md) | Guía de inicio paso a paso |
| [Environment](./docs/environment.md) | Variables de entorno |
| [CLI Commands](./docs/cli-commands.md) | Comandos CLI disponibles |
| [Development](./docs/development.md) | Flujo de desarrollo |
| [Troubleshooting](./docs/troubleshooting.md) | Problemas comunes |

**Documentación adicional:**
- [CLAUDE.md](./CLAUDE.md) - Entry point principal
- [CLAUDE.dev.md](./CLAUDE.dev.md) - Guía de desarrollo
- [CLAUDE.deploy.md](./CLAUDE.deploy.md) - Deployment y entornos

## Estructura del Monorepo

```
mks-telegram-bot/
├── core/              # Bot principal (@mks2508/telegram-bot-core)
│   ├── src/
│   │   ├── index.ts      # Entry point
│   │   ├── config/       # Configuration & env validation
│   │   ├── handlers/     # Command handlers
│   │   ├── middleware/   # Telegraf middleware
│   │   ├── types/        # TypeScript types & Result pattern
│   │   └── utils/        # Utilities (bot-manager, instance-manager)
│   └── .env.example      # Template de variables de entorno
├── packages/utils/      # Utilidades compartidas (@mks2508/telegram-bot-utils)
│   └── src/
│       ├── logger.ts     # Better Logger setup
│       └── result.ts     # Result type pattern
├── tools/              # CLI tools
│   └── commands/
│       ├── setup.ts     # Interactive setup
│       ├── doctor.ts    # Diagnostics
│       ├── status.ts    # Instance status
│       └── ngrok.ts     # ngrok integration
├── docs/               # Documentación
│   ├── getting-started.md
│   ├── environment.md
│   ├── cli-commands.md
│   ├── development.md
│   ├── troubleshooting.md
│   └── examples/       # Ejemplos de código
└── apps/               # Apps de ejemplo (futuro)
```

## Stack Tecnológico

| Herramienta | Versión | Uso |
| ----------- | ------ | --- |
| **Bun** | 1.3+ | Runtime & package manager |
| **TypeScript** | 5.9+ | Lenguaje |
| **Telegraf** | 4.16+ | Telegram Bot API |
| **Zod** | 3.24+ | Schema validation |
| **Better Logger** | 4.0.0 | Logging |
| **@mks2508/no-throw** | 0.1.0 | Result type pattern |
| **tsgo** | native-preview | Type checking |
| **oxlint** | latest | Linting |
| **prettier** | 3.4+ | Formatting |

## Features

### Core
- ✅ Result type pattern para error handling sin excepciones
- ✅ TypeScript strict mode con tipado completo
- ✅ Soporte polling y webhook modes
- ✅ Configuración centralizada con Zod validation
- ✅ Singleton pattern para BotManager y Config

### Multi-Entorno
- ✅ Soporte para local, staging, production
- ✅ Archivos `.env.{environment}` separados
- ✅ Selección vía `TG_ENV`
- ✅ Setup CLI interactivo

### Multi-Instancia
- ✅ Lock management con archivos PID
- ✅ Detección de conflictos
- ✅ Status CLI para ver instancias
- ✅ Doctor CLI para diagnóstico

### Logging System
Tres destinos de logging usando Better Logger 4.0.0:

1. **Console** - Colored output con preset cyberpunk
2. **File** - Logs persistentes con rotación automática
3. **Telegram** - Streaming a chat con buffering

### Bot Commands

**Public Commands**:
- `/start` - Welcome message
- `/health` - Health check
- `/uptime` - Uptime info
- `/stats` - Statistics
- `/logs` - Log streaming status

**Control Commands** (requieren autorización):
- `/stop` - Graceful shutdown
- `/restart` - Restart con stats reset
- `/mode` - Switch polling/webhook
- `/webhook` - Webhook configuration

## Development Workflow

### Setup Inicial

```bash
# Instalar dependencias
bun install

# Setup interactivo
bun run setup

# Verificar configuración
bun run doctor

# Arrancar en desarrollo
bun run dev
```

### Antes de Commitear

```bash
# Verificar tipo y lint
bun run build

# Ejecutar tests
bun test

# O usar precommit
bun run precommit
```

### Code Style

- TypeScript strict mode
- Semi: false, singleQuote: true
- Result type pattern para error handling
- Better Logger para logging (no console.*)

## Examples

Ver [`docs/examples/`](./docs/examples/) para ejemplos completos:

- [Simple Command](./docs/examples/simple-command.md) - Crear comandos
- [Auth Middleware](./docs/examples/middleware-auth.md) - Middleware de autenticación
- [Webhook Setup](./docs/examples/webhook-setup.md) - Configurar webhook

## Deployment

El template incluye configuración para:

- **Docker** - Dockerfile multi-stage incluido
- **VPS** - Guía para deployment en VPS
- **ngrok** - Integración para testing local
- **Multi-entorno** - local, staging, production

Ver [CLAUDE.deploy.md](./CLAUDE.deploy.md) para guía completa de deployment.

## License

MIT

## Autor

[@mks2508](https://github.com/mks2508)
