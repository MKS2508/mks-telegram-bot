# CLI Commands

Referencia completa de comandos CLI disponibles para gestionar el bot.

## Setup Command

Configura el entorno del bot de forma interactiva.

### Uso Básico

```bash
bun run setup
```

### Flags

| Flag | Descripción | Default |
| ---- | ----------- | ------- |
| `-t, --token <value>` | Bot token de @BotFather | Prompt interactivo |
| `-m, --mode <polling\|webhook>` | Modo de operación | Prompt interactivo |
| `-e, --environment <local\|staging\|production>` | Entorno objetivo | `local` |

### Ejemplos

```bash
# Setup interactivo completo
bun run setup

# Setup no-interactivo
bun run setup --token "123:ABC" --mode polling --environment local

# Setup para staging
bun run setup --environment staging

# Setup con token pre-proveedor
bun run setup --token "123:ABC"
```

### Qué Hace

1. **Copia** `.env.example` a `.env.{environment}`
2. **Pregunta** por bot token, modo, y opciones
3. **Valida** el token contra Telegram API
4. **Configura** todos los campos necesarios
5. **Muestra** próximos pasos

### Flujo Interactivo

```
ℹ mks-telegram-bot Setup

ℹ To get a bot token, open Telegram and talk to @BotFather:
  1. Send /newbot
  2. Choose a name for your bot
  3. Choose a username (must end in "bot")
  4. Copy the token provided

? Enter your bot token: ********************************

? Select bot operation mode: (Use arrow keys)
❯ Polling (recommended for development)
  Webhook (recommended for production)

? Select environment: (Use arrow keys)
❯ Local (development)
  Staging (testing)
  Production

? Enter instance name: (mks-bot)

✓ Environment configured: core/.env.local
```

## Doctor Command

Diagnostica la configuración del bot y el entorno.

### Uso

```bash
bun run doctor
```

### Checks Realizados

| Check | Descripción |
| ----- | ----------- |
| Node.js version | Versión >= 20 |
| Bun installation | Bun está instalado |
| Dependencies | Todas las dependencias instaladas |
| Environment files | Archivos .env existen |
| Environment variables | Variables requeridas seteadas |
| Bot token validation | Token válido contra Telegram API |
| Temp directory | core/tmp es writable |
| Logs directory | core/logs existe |
| Port availability | Puerto 3000 disponible |
| Git ignore | .env files excluidos |

### Output

```
mks-telegram-bot Diagnostics

✓ Node.js version              Node.js v20.x.x (requires >= 20)
✓ Bun installation             Bun is installed
✓ Dependencies                 All dependencies installed
✓ Environment files            Found: .env.local
✓ Environment variables        Required variables set
✓ Bot token validation         Bot token is valid
✓ Temp directory               core/tmp is writable
✓ Logs directory               core/logs exists
✓ Port availability            Port 3000 is available
✓ Git ignore                   .env files are excluded from git

Summary:
  ✓ Passed: 10
  ⚠ Warnings: 0
  ✗ Failed: 0

✓ All checks passed! Your bot is ready to run.

Next steps:
  1. Run: bun run dev
  2. Send /start to your bot
```

## Status Command

Muestra las instancias del bot corriendo actualmente.

### Uso

```bash
bun run cli status
```

### Flags

| Flag | Descripción |
| ---- | ----------- |
| `-j, --json` | Output como JSON |

### Ejemplos

```bash
# Tabla formateada
bun run cli status

# JSON
bun run cli status --json
```

### Output (Tabla)

```
┌─────────┬──────────┬─────────────┬────────────┬────────┬────────┐
│ (index) │   PID    │ Environment │    Name    │ Status │ Uptime │
├─────────┼──────────┼─────────────┼────────────┼────────┼────────┤
│    0    │  12345   │ 'production'│ 'mks-bot..' │'✓ Run' │ '2h30m'│
└─────────┴──────────┴─────────────┴────────────┴────────┴────────┘
```

### Output (JSON)

```json
[
  {
    "pid": 12345,
    "instanceId": "1734567890-abc123",
    "environment": "production",
    "instanceName": "mks-bot-prod",
    "startTime": "2025-01-06T10:30:00.000Z",
    "nodeVersion": "v1.3.0",
    "cwd": "/app",
    "running": true,
    "uptime": "2h30m"
  }
]
```

## Ngrok Command

Inicia ngrok tunnel con configuración automática de webhook.

### Uso

```bash
bun run ngrok
```

### Flags

| Flag | Descripción | Default |
| ---- | ----------- | ------- |
| `-p, --port <port>` | Puerto a forward | `3000` |
| `-e, --environment <env>` | Entorno: local/staging/production | `local` |
| `-w, --webhook-url` | Auto-update webhook URL en .env | `false` |
| `-s, --start-bot` | Auto-start bot después de ngrok | `false` |
| `-f, --force` | Force start aún si hay conflicto | `false` |

### Ejemplos

```bash
# Ngrok con configuración básica
bun run ngrok

# Ngrok con auto-update de webhook
bun run ngrok --webhook-url

# Ngrok y arrancar bot automáticamente
bun run ngrok --start-bot

# Ngrok para staging
bun run ngrok --environment staging

# Force start (ignorar conflictos)
bun run ngrok --force
```

### Flujo

1. **Carga** el archivo `.env.{environment}` correspondiente
2. **Detecta** conflictos con instancias existentes
3. **Inicia** ngrok tunnel
4. **Opcionalmente** actualiza `TG_WEBHOOK_URL` en el .env
5. **Opcionalmente** inicia el bot con `TG_ENV` configurado

### Output

```
ℹ Starting ngrok tunnel...
✓ ngrok tunnel started: https://abc123.ngrok.io
✓ Webhook URL updated in core/.env.local
ℹ You can now start the bot with: TG_ENV=local bun run dev
```

## Comandos de Desarrollo

Aunque no son comandos CLI separados, estos scripts están disponibles:

### `bun run dev`

Arranca el bot en modo desarrollo con hot reload.

```bash
bun run dev
```

- Usa `bun --watch` para recarga automática
- Carga `.env.local` por defecto
- Logs en consola con Better Logger

### `bun run start`

Arranca el bot en modo producción.

```bash
bun run start
```

- Sin hot reload
- Respeta `TG_ENV` para seleccionar entorno
- Logs mínimos (`warn`+)

### `bun run build`

Verifica tipo y lint.

```bash
bun run build
```

Ejecuta:
- `bun run typecheck` - TypeScript type checking
- `bun run lint` - Oxlint checking

### `bun run typecheck`

Type-check con tsgo.

```bash
bun run typecheck
```

### `bun run lint`

Lint con oxlint.

```bash
bun run lint
```

### `bun run test`

Ejecuta tests con Bun.

```bash
bun test
```

## Scripts de Utilidad

### `bun run clean`

Limpia node_modules del workspace.

```bash
bun run clean
```

### `bun run clean:logs`

Limpia logs y lock files.

```bash
bun run clean:logs
```

Elimina:
- `core/logs/*`
- `core/tmp/*.lock`
- `core/tmp/*.pid`

### `bun run clean:all`

Limpia todo: node_modules, logs, tmp.

```bash
bun run clean:all
```

## Comandos Multi-Entorno

### Setup para Entornos Específicos

```bash
# Setup local (default)
bun run setup

# Setup staging
bun run setup:staging

# Setup production
bun run setup:production
```

### Arrancar en Entornos Específicos

```bash
# Local (default)
bun run start

# Staging
TG_ENV=staging bun run start

# Production
TG_ENV=production bun run start
```

### ngrok para Entornos

```bash
# Local (default)
bun run ngrok

# Staging (con test bot)
bun run ngrok --environment staging

# Production (con webhook URL update)
bun run ngrok --environment production --webhook-url
```

## Referencias

- [Getting Started](./getting-started.md) - Guía de inicio
- [Environment](./environment.md) - Variables de entorno
- [Development](./development.md) - Flujo de desarrollo
