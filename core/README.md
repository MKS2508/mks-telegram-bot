# Telegram Bot Template

[English](#english) | [Español](#español)

---

## English

Production-ready Telegram bot template built with Telegraf, TypeScript, and
Better Logger. Designed for Bun workspace monorepos.

**Note:** This is a reusable template that can be extracted to a separate
repository.

## Features

- **Dual Mode**: Supports both polling and webhook update modes
- **Topic Support**: Optional Telegram topics for logs and control commands
- **Health Monitoring**: Built-in `/health`, `/uptime`, and `/stats` commands
- **Control Commands**: `/stop`, `/restart`, `/mode` switching
- **Log Streaming**: Real-time log forwarding to Telegram topics
- **Type Safety**: Full TypeScript strict mode with Zod validation
- **Better Logger**: Integrated with cyberpunk preset for beautiful logs
- **Authorization**: User-based auth middleware for restricted commands
- **Error Handling**: Global error catching with user-friendly messages

## Prerequisites

- Bun 1.3+
- Telegram bot token (get from [@BotFather](https://t.me/botfather))
- (Optional) Public HTTPS URL for webhook mode

## Installation

```bash
# Clone repository
git clone https://github.com/mks2508/bun-soulseek.git
cd apps/telegram-bot

# Install dependencies
bun install
```

## Configuration

Create a `.env` file in `apps/telegram-bot/`:

```bash
# Required: Bot token from @BotFather
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Required: Bot operation mode (polling or webhook)
TG_MODE=polling

# Required if TG_MODE=webhook
TG_WEBHOOK_URL=https://your-domain.com/webhook
TG_WEBHOOK_SECRET=random_secret_token

# Optional: Log topic configuration (for logs streaming)
TG_LOG_CHAT_ID=-1001234567890
TG_LOG_TOPIC_ID=123

# Optional: Control topic configuration (for health/commands)
TG_CONTROL_CHAT_ID=-1001234567890
TG_CONTROL_TOPIC_ID=124

# Optional: Authorized user IDs (comma-separated)
TG_AUTHORIZED_USER_IDS=123456789,987654321

# Optional: Log level (debug, info, warn, error)
LOG_LEVEL=info
```

### Environment Variables

| Variable                 | Required   | Description                                           |
| ------------------------ | ---------- | ----------------------------------------------------- |
| `TG_BOT_TOKEN`           | Yes        | Bot token from @BotFather                             |
| `TG_MODE`                | Yes        | `polling` or `webhook`                                |
| `TG_WEBHOOK_URL`         | If webhook | Public HTTPS URL for webhook                          |
| `TG_WEBHOOK_SECRET`      | No         | Secret token for webhook validation                   |
| `TG_LOG_CHAT_ID`         | No         | Chat ID for log streaming                             |
| `TG_LOG_TOPIC_ID`        | No         | Topic ID for log streaming                            |
| `TG_CONTROL_CHAT_ID`     | No         | Chat ID for control commands                          |
| `TG_CONTROL_TOPIC_ID`    | No         | Topic ID for control commands                         |
| `TG_AUTHORIZED_USER_IDS` | No         | Comma-separated authorized user IDs                   |
| `LOG_LEVEL`              | No         | `debug`, `info`, `warn`, or `error` (default: `info`) |

## Usage

### Development

```bash
# Start bot in development mode (hot reload)
bun run dev:bot

# Type-check only
bun run typecheck:bot
```

### Production

```bash
# Start bot
bun run --filter telegram-bot start

# Build (if needed)
bun run --filter telegram-bot build
```

## Commands

### General Commands (Available to all users)

| Command   | Description                        |
| --------- | ---------------------------------- |
| `/start`  | Welcome message with command list  |
| `/health` | Check bot health status            |
| `/uptime` | Show how long bot has been running |
| `/stats`  | Show bot statistics                |
| `/logs`   | Check log streaming status         |

### Control Commands (Authorized users only)

Control commands require `TG_CONTROL_CHAT_ID` and `TG_AUTHORIZED_USER_IDS` to be
configured.

| Command         | Description                        |
| --------------- | ---------------------------------- | ---------------------- |
| `/stop`         | Gracefully shutdown bot            |
| `/restart`      | Restart bot with stats reset       |
| `/mode <polling | webhook>`                          | Change bot update mode |
| `/webhook`      | Show current webhook configuration |

## Authorization

Control commands are restricted to authorized users:

1. Set `TG_CONTROL_CHAT_ID` to your group/channel ID
2. Set `TG_AUTHORIZED_USER_IDS` with your Telegram user ID (get from
   [@userinfobot](https://t.me/userinfobot))
3. Only authorized users can run `/stop`, `/restart`, `/mode`, `/webhook`

**Important**: Set `TG_CONTROL_CHAT_ID` even for private chats to enable control
commands.

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram API (Telegraf)                │
└─────────────────────────┬───────────────────────────────────┘
                        │
                        │
        ┌───────────────┴───────────────┐
        │                            │
   ┌────▼────┐  ┌─────────────────┐  ┌─────────────────┐
   │ Middleware  │  │  Handlers      │  │  BotManager    │
   │            │  │                │  │                │
   │ • auth     │  │ • health       │  │ • getStatus()  │
   │ • error    │  │ • control      │  │ • getStats()   │
   │ • logging  │  │ • logs         │  │ • start()       │
   │            │  │                │  │ • stop()        │
   │            │  │                │  │ • restart()     │
   │            │  │                │  │                │
   └────────────┘  └─────────────────┘  └──────────────────┘
                        │
                        │
                        ▼
            ┌─────────────────────┐
            │  Config Manager   │
            │  • getConfig()    │
            │  • updateConfig()  │
            │  • loadEnvConfig() │
            └─────────────────────┘
```

### Component Details

**BotManager**

- Manages bot lifecycle (start, stop, restart)
- Tracks statistics (messages, commands, errors)
- Provides status information
- Methods: `start()`, `stop()`, `restart()`, `getStatus()`, `getStats()`,
  `resetStats()`

**Config System**

- Environment variable validation with Zod
- Caching of configuration
- Functions: `getConfig()`, `updateConfig()`, `loadEnvConfig()`

**Handlers**

- `/health`, `/uptime`, `/stats` - Health and stats commands
- `/stop`, `/restart`, `/mode`, `/webhook` - Control commands (require auth)
- `/logs` - Log streaming handler

**Middleware**

- `errorHandler()` - Global error catching
- `auth()` - User authorization validation
- `topicValidation()` - Topic ID validation
- `logging()` - Better Logger integration

### Data Flow

```
Telegram Update → Error Handler → Topic Validation → Auth Middleware → Handler → BotManager → Response
```

## Webhook Mode

For webhook mode, you need:

1. **Public HTTPS URL** (e.g., using ngrok, Cloudflare Tunnel, or VPS)
2. **Port 80/443** accessible from internet
3. **Firewall rules** allowing incoming traffic

Example setup with ngrok:

```bash
# Run ngrok
ngrok http 3000

# Set env
TG_WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app/webhook
TG_MODE=webhook

# Start bot
bun run dev:bot
```

## Log Streaming

Logs are streamed to Telegram when `TG_LOG_CHAT_ID` is configured:

- **Buffering**: Logs are buffered (max 10 messages, 5 second timeout)
- **Rate Limiting**: Automatic rate limiting to prevent spam
- **Levels**: Only logs matching `LOG_LEVEL` are streamed

Disable log streaming by removing `TG_LOG_CHAT_ID` from `.env`.

## Troubleshooting

### Bot doesn't respond to commands

**Problem**: Bot receives commands but doesn't respond

**Solutions:**

- Verify `TG_BOT_TOKEN` is correct
- Check bot is running with `/health` command
- Ensure you're messaging the correct bot account
- Verify `TG_AUTHORIZED_USER_IDS` for control commands

### Webhook not receiving updates

**Problem**: Webhook configured but Telegram doesn't send updates

**Solutions:**

- Verify `TG_WEBHOOK_URL` is publicly accessible
  ```bash
  curl https://your-webhook-url.com/webhook
  ```
- Check firewall allows incoming connections
- Verify URL uses HTTPS (required by Telegram)
- Check bot logs for webhook setup errors
- Use a Telegram bot API tester to verify webhook URL

### Log streaming not working

**Problem**: Logs aren't being sent to Telegram

**Solutions:**

- Verify `TG_LOG_CHAT_ID` is set correctly
- Check bot has permission to send messages in the chat
- Verify `TG_LOG_TOPIC_ID` matches topic ID (get from Telegram)
- Check `LOG_LEVEL` is appropriate for logs you expect

### Typecheck errors

```bash
# Install dependencies
bun install

# Run typecheck
bun run typecheck:bot

# Format code
bun run format
```

### Permission denied errors

**Problem**: Bot returns "not enough rights" or similar errors

**Solutions:**

- Verify bot is admin of the group/channel
- Check bot has permission to send messages
- Verify topic IDs are correct (topics require bot admin rights)
- Remove and re-add bot to the chat to refresh permissions

## Development

```bash
# Install dependencies
bun install

# Run in watch mode
bun run dev:bot

# Type-check only
bun run typecheck:bot

# Run linter
bun run lint

# Format code
bun run format

# Check formatting
bun run format:check
```

## Project Structure

```
apps/telegram-bot/
├── src/
│   ├── index.ts                    # Bot entry point
│   ├── config/
│   │   ├── env.ts                  # Environment validation
│   │   └── index.ts                # Config management
│   ├── middleware/
│   │   ├── auth.ts                 # Authorization middleware
│   │   ├── error-handler.ts        # Global error handling
│   │   ├── logging.ts              # Better Logger integration
│   │   └── topics.ts               # Topic validation
│   ├── handlers/
│   │   ├── health.ts               # Health & stats commands
│   │   ├── control.ts              # Control commands
│   │   └── logs.ts                 # Log streaming
│   ├── utils/
│   │   ├── bot-manager.ts          # Bot lifecycle management
│   │   └── formatters.ts           # Message formatters
│   └── types/
│       ├── bot.ts                  # TypeScript interfaces
│       ├── result.ts               # Result monad
│       └── constants.ts            # Constants
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Customization

### Adding New Commands

1. Create handler function in `src/handlers/`:

```typescript
// src/handlers/custom.ts
import type { Context } from 'telegraf'

export async function handleCustom(ctx: Context): Promise<void> {
  await ctx.reply('Custom command response')
}
```

2. Register in `src/index.ts`:

```typescript
import { handleCustom } from './handlers/custom.js'

bot.command('custom', handleCustom)
```

### Adding Custom Middleware

```typescript
// src/middleware/custom.ts
import type { Context, Middleware } from 'telegraf'

export function customMiddleware(): Middleware<Context> {
  return async (ctx, next) => {
    // Your logic here
    return next()
  }
}

// Register in src/index.ts
import { customMiddleware } from './middleware/custom.js'
bot.use(customMiddleware())
```

### Customizing Log Levels

```typescript
// src/middleware/logging.ts
import { getConfig } from '../config/index.js'
import logger from '@mks2508/better-logger'

const config = getConfig()

if (config.logLevel === 'debug') {
  logger.preset('debug')
  logger.showLocation()
} else {
  logger.preset('cyberpunk')
}

logger.showTimestamp()
```

## Public API: BotManager

```typescript
import { botManager } from './utils/bot-manager.js'

// Start bot
await botManager.start(bot, 'polling')

// Get current status
const statusResult = botManager.getStatus()
if (statusResult.ok) {
  console.log(`Bot status: ${statusResult.value.status}`)
  console.log(`Mode: ${statusResult.value.mode}`)
  console.log(`Uptime: ${statusResult.value.uptime}ms`)
  console.log(`Memory:`, statusResult.value.memoryUsage)
}

// Get statistics
const statsResult = botManager.getStats()
if (statsResult.ok) {
  console.log(`Messages: ${statsResult.value.messagesProcessed}`)
  console.log(`Commands: ${statsResult.value.commandsExecuted}`)
  console.log(`Errors: ${statsResult.value.errorsEncountered}`)
}

// Restart bot
await botManager.restart()

// Stop bot
await botManager.stop('reason')

// Reset statistics
await botManager.resetStats()

// Check authorization
const isAuth = botManager.authorize(userId)
if (isAuth.ok) {
  console.log('User is authorized')
} else {
  console.log('User is not authorized')
}
```

## Monitoring

### Health Check

```bash
# In Telegram (any chat)
/health

# Shows:
# - Bot status (running/stopped)
# - Current mode (polling/webhook)
# - Uptime
# - Memory usage
```

### Statistics

```bash
/uptime

/stats

# Shows:
# - Messages processed
# - Commands executed
# - Errors encountered
# - Configuration overview
```

## Resources

- [Telegraf Documentation](https://telegraf.js.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Better Logger](https://github.com/mks2508/better-logger)
- [Bun Documentation](https://bun.sh/docs)

## License

MIT

## Author

MKS2508

## Contributing

This is a template. Feel free to fork and customize for your use case.

### Best Practices

- Use TypeScript strict mode
- Add JSDoc to public functions
- Follow existing code patterns
- Test before committing
- Keep commits atomic and descriptive

## Updates

To update dependencies:

```bash
bun install
```

To add new dependencies:

```bash
cd apps/telegram-bot
bun add package-name
```

## Reporting Issues

For issues specific to this template, open an issue in the repository.

For Telegraf issues: https://github.com/telegraf/telegraf/issues For Better
Logger issues: https://github.com/mks2508/better-logger/issues

---

## Español

Plantilla de bot de Telegram lista para producción construida con Telegraf,
TypeScript y Better Logger. Diseñada para monorepos de Bun workspace.

**Nota:** Esta es una plantilla reutilizable que puede ser extraída a un
repositorio separado.

## Características

- **Modo Dual**: Soporte para ambos modos de actualización (polling y webhook)
- **Soporte de Topics**: Topics opcionales de Telegram para logs y comandos de
  control
- **Monitoreo de Salud**: Comandos incorporados `/health`, `/uptime`, `/stats`
- **Comandos de Control**: `/stop`, `/restart`, `/mode` para cambio de modo
- **Streaming de Logs**: Reenvío en tiempo real de logs a topics de Telegram
- **Type Safety**: Modo estricto de TypeScript completo con validación Zod
- **Better Logger**: Integrado con preset cyberpunk para logs hermosos
- **Autorización**: Middleware de autorización basada en usuarios para comandos
  restringidos
- **Manejo de Errores**: Captura global de errores con mensajes amigables al
  usuario

## Requisitos

- Bun 1.3+
- Token de bot de Telegram (obtener de [@BotFather](https://t.me/botfather))
- (Opcional) URL HTTPS pública para modo webhook

## Instalación

```bash
# Clonar repositorio
git clone https://github.com/mks2508/bun-soulseek.git
cd apps/telegram-bot

# Instalar dependencias
bun install
```

## Configuración

Crear un archivo `.env` en `apps/telegram-bot/`:

```bash
# Requerido: Token de bot de @BotFather
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Requerido: Modo de operación del bot (polling o webhook)
TG_MODE=polling

# Requerido si TG_MODE=webhook
TG_WEBHOOK_URL=https://tu-dominio.com/webhook
TG_WEBHOOK_SECRET=token_secreto_aleatorio

# Opcional: Configuración de topic de logs (para streaming)
TG_LOG_CHAT_ID=-1001234567890
TG_LOG_TOPIC_ID=123

# Opcional: Configuración de topic de control (para salud/comandos)
TG_CONTROL_CHAT_ID=-1001234567890
TG_CONTROL_TOPIC_ID=124

# Opcional: IDs de usuarios autorizados (separados por comas)
TG_AUTHORIZED_USER_IDS=123456789,987654321

# Opcional: Nivel de log (debug, info, warn, error)
LOG_LEVEL=info
```

### Variables de Entorno

| Variable                 | Requerida     | Descripción                                          |
| ------------------------ | ------------- | ---------------------------------------------------- |
| `TG_BOT_TOKEN`           | Sí            | Token de bot de @BotFather                           |
| `TG_MODE`                | Sí            | `polling` o `webhook`                                |
| `TG_WEBHOOK_URL`         | Si es webhook | URL HTTPS pública para webhook                       |
| `TG_WEBHOOK_SECRET`      | No            | Token secreto para validación de webhook             |
| `TG_LOG_CHAT_ID`         | No            | Chat ID para streaming de logs                       |
| `TG_LOG_TOPIC_ID`        | No            | Topic ID para streaming de logs                      |
| `TG_CONTROL_CHAT_ID`     | No            | Chat ID para comandos de control                     |
| `TG_CONTROL_TOPIC_ID`    | No            | Topic ID para comandos de control                    |
| `TG_AUTHORIZED_USER_IDS` | No            | IDs de usuarios autorizados (separados por comas)    |
| `LOG_LEVEL`              | No            | `debug`, `info`, `warn`, o `error` (default: `info`) |

## Uso

### Desarrollo

```bash
# Iniciar bot en modo desarrollo (recarga en caliente)
bun run dev:bot

# Solo verificar tipos
bun run typecheck:bot
```

### Producción

```bash
# Iniciar bot
bun run --filter telegram-bot start

# Construir (si es necesario)
bun run --filter telegram-bot build
```

## Comandos

### Comandos Generales (Disponibles para todos los usuarios)

| Comando   | Descripción                                 |
| --------- | ------------------------------------------- |
| `/start`  | Mensaje de bienvenida con lista de comandos |
| `/health` | Verificar estado de salud del bot           |
| `/uptime` | Mostrar tiempo de ejecución del bot         |
| `/stats`  | Mostrar estadísticas del bot                |
| `/logs`   | Verificar estado de streaming de logs       |

### Comandos de Control (Solo usuarios autorizados)

Los comandos de control requieren `TG_CONTROL_CHAT_ID` y
`TG_AUTHORIZED_USER_IDS` configurados.

| Comando         | Descripción                              |
| --------------- | ---------------------------------------- | ------------------------------------- |
| `/stop`         | Apagar bot graciosamente                 |
| `/restart`      | Reiniciar bot con reset de estadísticas  |
| `/mode <polling | webhook>`                                | Cambiar modo de actualización del bot |
| `/webhook`      | Mostrar configuración actual del webhook |

## Autorización

Los comandos de control están restringidos a usuarios autorizados:

1. Configura `TG_CONTROL_CHAT_ID` con tu ID de grupo/canal
2. Configura `TG_AUTHORIZED_USER_IDS` con tu ID de usuario de Telegram (obtener
   de [@userinfobot](https://t.me/userinfobot))
3. Solo los usuarios autorizados pueden ejecutar `/stop`, `/restart`, `/mode`,
   `/webhook`

**Importante**: Configura `TG_CONTROL_CHAT_ID` incluso para chats privados para
habilitar comandos de control.

## Arquitectura

### Visión General de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     API de Telegram (Telegraf)                │
└─────────────────────────┬───────────────────────────────────┘
                        │
                        │
        ┌───────────────┴───────────────┐
        │                            │
   ┌────▼────┐  ┌─────────────────┐  ┌─────────────────┐
   │ Middleware  │  │  Handlers      │  │  BotManager    │
   │            │  │                │  │                │
   │ • auth     │  │ • health       │  │ • getStatus()  │
   │ • error    │  │ • control      │  │ • getStats()   │
   │ • logging  │  │ • logs         │  │ • start()       │
   │            │  │                │  │ • stop()        │
   │            │  │                │  │ • restart()     │
   └────────────┘  └─────────────────┘  └──────────────────┘
                        │
                        ▼
            ┌─────────────────────┐
            │  Config Manager   │
            │  • getConfig()    │
            │  • updateConfig()  │
            │  • loadEnvConfig() │
            └─────────────────────┘
```

### Detalles de Componentes

**BotManager**

- Gestiona el ciclo de vida del bot (start, stop, restart)
- Rastrea estadísticas (mensajes, comandos, errores)
- Proporciona información de estado
- Métodos: `start()`, `stop()`, `restart()`, `getStatus()`, `getStats()`,
  `resetStats()`

**Sistema de Configuración**

- Validación de variables de entorno con Zod
- Caching de configuración
- Funciones: `getConfig()`, `updateConfig()`, `loadEnvConfig()`

**Handlers**

- `/health`, `/uptime`, `/stats` - Comandos de salud y estadísticas
- `/stop`, `/restart`, `/mode`, `/webhook` - Comandos de control (requieren
  auth)
- `/logs` - Handler de streaming de logs

**Middleware**

- `errorHandler()` - Captura global de errores
- `auth()` - Validación de autorización de usuarios
- `topicValidation()` - Validación de IDs de topics
- `logging()` - Integración con Better Logger

### Flujo de Datos

```
Actualización de Telegram → Handler de Errores → Validación de Topics → Middleware de Auth → Handler → BotManager → Respuesta
```

## Modo Webhook

Para modo webhook, necesitas:

1. **URL HTTPS pública** (ej. usando ngrok, Cloudflare Tunnel, o VPS)
2. **Puerto 80/443** accesible desde internet
3. **Reglas de firewall** permitiendo tráfico entrante

Ejemplo de configuración con ngrok:

```bash
# Ejecutar ngrok
ngrok http 3000

# Configurar env
TG_WEBHOOK_URL=https://tu-url-ngrok.ngrok-free.app/webhook
TG_MODE=webhook

# Iniciar bot
bun run dev:bot
```

## Streaming de Logs

Los logs se envían a Telegram cuando `TG_LOG_CHAT_ID` está configurado:

- **Buffering**: Los logs se bufferizan (máximo 10 mensajes, 5 segundos de
  timeout)
- **Rate Limiting**: Limitación automática de tasa para prevenir spam
- **Niveles**: Solo los logs que coincidan con `LOG_LEVEL` se envían

Desactiva el streaming de logs removiendo `TG_LOG_CHAT_ID` de `.env`.

## Solución de Problemas

### El bot no responde a los comandos

**Problema**: El bot recibe comandos pero no responde

**Soluciones:**

- Verifica que `TG_BOT_TOKEN` es correcto
- Comprueba si el bot está ejecutándose con el comando `/health`
- Asegúrate de que estás enviando mensajes a la cuenta correcta del bot
- Verifica `TG_AUTHORIZED_USER_IDS` para comandos de control

### Webhook no recibe actualizaciones

**Problema**: Webhook configurado pero Telegram no envía actualizaciones

**Soluciones:**

- Verifica que `TG_WEBHOOK_URL` es públicamente accesible
  ```bash
  curl https://tu-url-webhook.com/webhook
  ```
- Comprueba el firewall permite conexiones entrantes
- Verifica que la URL usa HTTPS (requerido por Telegram)
- Revisa los logs del bot para errores de configuración del webhook
- Usa un probador de la API de bots de Telegram para verificar la URL del
  webhook

### El streaming de logs no funciona

**Problema**: Los logs no se están enviando a Telegram

**Soluciones:**

- Verifica que `TG_LOG_CHAT_ID` está configurado correctamente
- Comprueba que el bot tiene permiso para enviar mensajes en el chat
- Verifica que `TG_LOG_TOPIC_ID` coincide con el ID del topic (obtener de
  Telegram)
- Verifica que `LOG_LEVEL` es apropiado para los logs que esperas

### Errores de typecheck

```bash
# Instalar dependencias
bun install

# Verificar tipos
bun run typecheck:bot

# Formatear código
bun run format
```

### Errores de permiso denegado

**Problema**: El bot devuelve "no tiene suficientes derechos" o errores
similares

**Soluciones:**

- Verifica que el bot es admin del grupo/canal
- Comprueba que el bot tiene permiso para enviar mensajes
- Verifica que los IDs de topic son correctos (los topics requieren derechos de
  admin del bot)
- Elimina y vuelve a añadir el bot al chat para refrescar permisos

## Desarrollo

```bash
# Instalar dependencias
bun install

# Ejecutar en modo watch
bun run dev:bot

# Solo verificar tipos
bun run typecheck:bot

# Ejecutar linter
bun run lint

# Formatear código
bun run format

# Verificar formateo
bun run format:check
```

## Estructura del Proyecto

```
apps/telegram-bot/
├── src/
│   ├── index.ts                    # Punto de entrada del bot
│   ├── config/
│   │   ├── env.ts                  # Validación de entorno
│   │   └── index.ts                # Gestión de configuración
│   ├── middleware/
│   │   ├── auth.ts                 # Middleware de autorización
│   │   ├── error-handler.ts        # Manejo global de errores
│   │   ├── logging.ts              # Integración con Better Logger
│   │   └── topics.ts               # Validación de topics
│   ├── handlers/
│   │   ├── health.ts               # Comandos de salud y estadísticas
│   │   ├── control.ts              # Comandos de control
│   │   └── logs.ts                 # Streaming de logs
│   ├── utils/
│   │   ├── bot-manager.ts          # Gestión del ciclo de vida del bot
│   │   └── formatters.ts           # Formateadores de mensajes
│   └── types/
│       ├── bot.ts                  # Interfaces TypeScript
│       ├── result.ts               # Monad de Result
│       └── constants.ts            # Constantes
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Personalización

### Añadir Nuevos Comandos

1. Crear función handler en `src/handlers/`:

```typescript
// src/handlers/custom.ts
import type { Context } from 'telegraf'

export async function handleCustom(ctx: Context): Promise<void> {
  await ctx.reply('Respuesta de comando personalizado')
}
```

2. Registrar en `src/index.ts`:

```typescript
import { handleCustom } from './handlers/custom.js'

bot.command('custom', handleCustom)
```

### Añadir Middleware Personalizado

```typescript
// src/middleware/custom.ts
import type { Context, Middleware } from 'telegraf'

export function customMiddleware(): Middleware<Context> {
  return async (ctx, next) => {
    // Tu lógica aquí
    return next()
  }
}

// Registrar en src/index.ts
import { customMiddleware } from './middleware/custom.js'
bot.use(customMiddleware())
```

### Personalizar Niveles de Log

```typescript
// src/middleware/logging.ts
import { getConfig } from '../config/index.js'
import logger from '@mks2508/better-logger'

const config = getConfig()

if (config.logLevel === 'debug') {
  logger.preset('debug')
  logger.showLocation()
} else {
  logger.preset('cyberpunk')
}

logger.showTimestamp()
```

## API Pública: BotManager

```typescript
import { botManager } from './utils/bot-manager.js'

// Iniciar bot
await botManager.start(bot, 'polling')

// Obtener estado actual
const statusResult = botManager.getStatus()
if (statusResult.ok) {
  console.log(`Estado del bot: ${statusResult.value.status}`)
  console.log(`Modo: ${statusResult.value.mode}`)
  console.log(`Uptime: ${statusResult.value.uptime}ms`)
  console.log(`Memoria:`, statusResult.value.memoryUsage)
}

// Obtener estadísticas
const statsResult = botManager.getStats()
if (statsResult.ok) {
  console.log(`Mensajes: ${statsResult.value.messagesProcessed}`)
  console.log(`Comandos: ${statsResult.value.commandsExecuted}`)
  console.log(`Errores: ${statsResult.value.errorsEncountered}`)
}

// Reiniciar bot
await botManager.restart()

// Apagar bot
await botManager.stop('razón')

// Resetear estadísticas
await botManager.resetStats()

// Verificar autorización
const isAuth = botManager.authorize(userId)
if (isAuth.ok) {
  console.log('Usuario autorizado')
} else {
  console.log('Usuario no autorizado')
}
```

## Recursos

- [Documentación de Telegraf](https://telegraf.js.org/)
- [API de Bots de Telegram](https://core.telegram.org/bots/api)
- [Better Logger](https://github.com/mks2508/better-logger)
- [Documentación de Bun](https://bun.sh/docs)

## Licencia

MIT

## Autor

MKS2508

## Contribuyendo

Esta es una plantilla. Siéntete libre de fork y personalizar para tu caso de
uso.

### Mejores Prácticas

- Usa modo estricto de TypeScript
- Añade JSDoc a funciones públicas
- Sigue los patrones de código existentes
- Prueba antes de hacer commit
- Mantén commits atómicos y descriptivos

## Actualizaciones

Para actualizar dependencias:

```bash
bun install
```

Para añadir nuevas dependencias:

```bash
cd apps/telegram-bot
bun add package-name
```

## Reportando Problemas

Para problemas específicos de esta plantilla, abre un issue en el repositorio.

Para problemas de Telegraf: https://github.com/telegraf/telegraf/issues Para
problemas de Better Logger: https://github.com/mks2508/better-logger/issues

---

<div align="center">

Made with ❤️ by [MKS2508](https://github.com/mks2508)
