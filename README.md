# mks-telegram-bot

Template monorepo para bots de Telegram con Bun, Telegraf y TypeScript.

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

## Estructura

```
mks-telegram-bot/
├── core/                 # @mks2508/telegram-bot-core
│   └── src/
│       ├── index.ts      # Entry point
│       ├── config/       # Configuration & env validation
│       ├── types/        # TypeScript types & Result pattern
│       ├── middleware/   # Telegraf middleware
│       ├── handlers/     # Command handlers
│       └── utils/        # Utilities
└── apps/                 # Future: docs, examples
```

## Stack

| Herramienta       | Uso                       |
| ----------------- | ------------------------- |
| **Bun**           | Runtime & package manager |
| **Telegraf**      | Telegram Bot API          |
| **Zod**           | Schema validation         |
| **Better Logger** | Logging (v4.0.0)           |
| **@mks2508/no-throw** | Result type pattern |
| **tsgo**          | Type checking             |
| **oxlint**        | Linting                   |
| **prettier**      | Formatting                |
| **bun test**      | Testing framework         |

## Scripts

### Desarrollo

```bash
bun run dev           # Dev mode con watch
bun run start         # Production
```

### Calidad de Código

```bash
bun run typecheck     # Type check con tsgo
bun run lint          # Lint con oxlint
bun run lint:fix      # Fix linting issues
bun run format        # Format con prettier
bun run format:check  # Check formatting
```

### Testing

```bash
bun test              # Run all tests
bun run test:watch    # Watch mode
bun run test:coverage # Coverage report
```

## Features

### Core
- ✅ Result type pattern para error handling sin excepciones
- ✅ TypeScript strict mode con tipado completo
- ✅ Soporte polling y webhook modes
- ✅ Configuración centralizada con Zod validation
- ✅ Singleton pattern para BotManager y Config

### Bot Commands

**Public Commands**:
- `/start` - Welcome message con lista de comandos
- `/health` - Health check del bot
- `/uptime` - Información de uptime
- `/stats` - Estadísticas de uso
- `/logs` - Status de log streaming

**Control Commands** (requieren autorización):
- `/stop` - Graceful shutdown
- `/restart` - Restart con stats reset
- `/mode` - Cambiar entre polling/webhook
- `/webhook` - Ver/configurar webhook

### Logging System

Tres destinos de logging usando Better Logger 4.0.0:

1. **Console** - Colored output con preset cyberpunk
2. **File** - Logs persistentes con rotación automática
3. **Telegram** - Streaming a chat con buffering

Configuración vía variables de entorno:
```bash
LOG_LEVEL=info                    # Nivel de log
TG_LOG_FILE_ENABLED=true         # Habilitar file logging
TG_LOG_DIR=./logs                # Directorio de logs
TG_LOG_MAX_SIZE=1048576           # Max file size (1MB)
TG_LOG_LEVELS=info,warn,error     # Niveles para archivos
TG_LOG_CHAT_ID=-1001234567890     # Chat ID para streaming
```

### Middleware

- **ErrorHandler** - Captura y maneja errores globalmente
- **TopicValidation** - Valida mensajes de forum topics
- **Auth** - Autorización para control commands

### Architecture

```
Update → ErrorHandler → TopicValidation → Auth → Handler → BotManager → Response
```

## Development Workflow

### Antes de commitear

```bash
bun run typecheck     # Debe pasar sin errores
bun run lint          # Debe pasar (0 warnings, 0 errors)
bun test              # Todos los tests deben pasar
```

### Code Style

- TypeScript strict mode
- Semi: false, singleQuote: true
- Result type pattern para error handling
- Better Logger para logging (no console.*)

## TODO

- [ ] Docker configuration
- [ ] Deployment scripts
- [ ] Ejemplos en `apps/`
- [ ] CLI para scaffolding
