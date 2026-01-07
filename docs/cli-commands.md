# CLI Commands

Referencia completa de comandos CLI disponibles para gestionar el bot.

## Flujo Recomendado

```bash
# 1. Setup del entorno (configura todo)
bun run setup

# 2. Doctor (verifica que todo esté correcto)
bun run doctor

# 3. Arrancar bot
bun run dev
```

> **Setup → Doctor → Dev** es el flujo recomendado para cualquier cambio de configuración.

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

1. **Detecta** contexto actual (qué existe, qué falta)
2. **Pregunta** objetivo (new-bot, add-ids, create-topics, bootstrap, manual)
3. **Ejecuta** pre-checks de validación
4. **Configura** campos necesarios según modo seleccionado
5. **Muestra** resumen de cambios
6. **Sugiere** ejecutar `bun run doctor` para verificar

### Siguiente Paso Recomendado

Después de setup, **siempre ejecuta doctor**:

```bash
bun run doctor
```

Esto valida:
- Token válido contra Telegram API
- Variables de entorno configuradas
- Dependencias instaladas
- Puertos disponibles
- Permisos de directorios

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

## Bootstrap Command

Crea automáticamente un bot, grupo y topics mediante interacción con @BotFather.

> **Este es un "BotFather personal"** - automatiza todo el proceso de creación de bots.

### Uso

```bash
bun run bootstrap
```

### Flags

| Flag | Descripción | Default |
| ---- | ----------- | ------- |
| `-e, --environment <local\|staging\|production>` | Entorno objetivo | `local` |
| `--bot-name <value>` | Nombre del bot (display name) | Prompt interactivo |
| `--bot-username <value>` | Username del bot (debe terminar en "bot") | Prompt interactivo |
| `--group-name <value>` | Nombre del grupo/forum | Prompt interactivo |
| `--skip-topics` | Skip creación de topics | `false` |

### Ejemplos

```bash
# Bootstrap interactivo completo
bun run bootstrap

# Bootstrap con nombres pre-proveídos
bun run bootstrap --bot-name "Mi Bot" --bot-username "mi_bot_v1" --group-name "Control Group"

# Bootstrap para staging
bun run bootstrap --environment staging

# Bootstrap sin crear topics
bun run bootstrap --skip-topics
```

### Requisitos Previos

Antes de ejecutar bootstrap, necesitas **credenciales MTProto API**:

1. Ve a [https://my.telegram.org](https://my.telegram.org)
2. Log in con tu número de teléfono
3. Click en "API development tools"
4. Llena el formulario:
   - **App title**: My Bot App
   - **Short name**: mybotapp
   - **Platform**: Desktop o Web
   - **Description**: (opcional)
5. Click "Create application"
6. Copia el `api_id` y `api_hash`

> **Puedes guardar las credenciales** en tu `.env` para evitar re-pedirlas:
> ```bash
> # MTProto API Credentials (for bootstrap command)
> TG_API_ID=12345678
> TG_API_HASH=abc123def456789...
> ```

### Flujo Interactivo

#### Paso 1: Verificación de Entorno

```
ℹ Environment file found: core/.env.local
```

#### Paso 2: Credenciales MTProto (si no están en .env)

```
📱 Telegram MTProto API Credentials

To create bots and groups automatically, you need MTProto API credentials.

📋 STEP-BY-STEP GUIDE:

1. Open https://my.telegram.org in your browser
2. Log in with your phone number (the same number you use in Telegram)
3. Click on "API development tools"
4. Fill in the form:
   - App title: My Bot App
   - Short name: mybotapp
   - Platform: Desktop or Web
   - Description: (optional)
5. Click "Create application"
6. Copy the api_id and api_hash from the next page

? Do you want to save API credentials to .env file for future use? (Y/n)

? Enter your API ID: ********

? Enter your API Hash: ************************************
```

#### Paso 3: Autorización de Telegram

Si es tu primera vez, te pedirá autorización:

```
🔐 Telegram Authorization Required
This is a one-time process. Your session will be saved for future use.

📝 STEP 1: Phone Number
Enter your phone number with country code.
Example: +34612345678 (Spain) or +12025551234 (USA)

? Enter your phone number: +34612345678

⏳ Sending verification code...
Check your Telegram app for the code.

📝 STEP 2: Verification Code
Enter the code you received in Telegram.
The code is 5-7 digits long.

? Enter the code: 12345

⏳ Verifying code...
✅ Code verified!

📝 STEP 3: Two-Factor Authentication (2FA)
You have Cloud Password enabled.
Enter your password to continue.

? Enter your 2FA password: ********

⏳ Verifying password...
✅ Password verified!

💾 Saving session...

✅ Successfully authorized!
Your session has been saved to: /Users/youruser/.mks-telegram-bot/session.txt
Next time you won't need to login again.
```

> **Tu sesión se guarda automáticamente** en `~/.mks-telegram-bot/session.txt` para futuros usos.

#### Paso 4: Creación del Bot

```
🚀 Complete Bot Bootstrap

🤖 Step 1: Creating Bot

⠋ Creating bot via @BotFather...
✓ Bot created: @mi_bot_v1
```

#### Paso 5: Creación del Grupo/Forum

```
💬 Step 2: Creating Group/Forum

⠋ Creating supergroup with forum mode...
✓ Group created: Control Group (ID: -1001234567890)

⠋ Adding bot as admin...
✓ Bot added as admin
```

#### Paso 6: Creación de Topics

```
🧵 Step 3: Creating Topics

⠋ Creating forum topics...
✓ Created 5 topics
  General: 1
  Control: 2
  Logs: 3
  Config: 4
  Bugs: 5
```

#### Paso 7: Actualización de Configuración

```
🔧 Step 4: Updating Configuration

⠋ Updating .env file...
✓ Updated core/.env.local
```

### Resumen Final

```
✅ Bootstrap Complete

Bot Information:
  Username: @mi_bot_v1
  Token: 123456:ABC-...

Group Information:
  Name: Control Group
  Chat ID: -1001234567890

Topic IDs:
  General: 1
  Control: 2
  Logs: 3
  Config: 4
  Bugs: 5

✓ Your bot is now ready to use!

ℹ Next steps:
  1. Review the configuration in core/.env.local
  2. Run: bun run dev
  3. Send /start to your bot in Telegram
```

### Qué Hace

El comando bootstrap automatiza **todo el proceso**:

1. **Verifica** que el entorno existe (ejecuta `setup` si es necesario)
2. **Obtiene** credenciales MTProto API (del .env o interactivo)
3. **Autentica** con tu cuenta de Telegram (sesión guardada para futuro)
4. **Crea el bot** vía @BotFather automáticamente
5. **Crea un supergroup/forum** para el bot
6. **Añade el bot como admin** del grupo
7. **Crea topics** automáticamente (General, Control, Logs, Config, Bugs)
8. **Actualiza el .env** con todos los IDs (bot token, chat ID, topic IDs)
9. **Muestra el resumen** con próximos pasos

### Variables de Entorno Configuradas

Después de bootstrap, tu `.env` tendrá:

```bash
# Configurado automáticamente por bootstrap
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TG_CONTROL_CHAT_ID=-1001234567890
TG_CONTROL_TOPIC_ID=2
TG_LOG_TOPIC_ID=3
TG_LOG_CHAT_ID=-1001234567890

# MTProto credentials (si guardaste)
TG_API_ID=12345678
TG_API_HASH=abc123def456789...
```

### Ventajas vs Setup Manual

| Feature | Bootstrap | Setup Manual |
|---------|-----------|--------------|
| Creación de bot | Automático (@BotFather) | Manual (hablar con @BotFather) |
| Creación de grupo | Automático | Manual |
| Creación de topics | Automática | Manual (o comando separado) |
| IDs detection | Automático | Requiere auto-configure |
| Tiempo total | ~3-5 minutos | ~10-15 minutos |
| Interacción | Una sola vez | Varios pasos |

### Troubleshooting

#### Error: "Environment file not found"

```bash
# Primero ejecuta setup para crear el entorno
bun run setup
# Luego bootstrap
bun run bootstrap
```

#### Error: "Authorization failed"

- Verifica que tu número de teléfono sea correcto (con código de país)
- Asegúrate de recibir el código de verificación en tu Telegram
- Si tienes 2FA, ten tu contraseña lista

#### Error: "Failed to create bot"

- El username puede estar en uso (prueba otro)
- El username debe terminar en "bot"
- Verifica que @BotFather no esté bloqueado

#### Sesión Corrupta

Si tienes problemas con la sesión guardada:

```bash
# Elimina la sesión
rm ~/.mks-telegram-bot/session.txt

# Vuelve a ejecutar bootstrap (te pedirá login de nuevo)
bun run bootstrap
```

### Seguridad

- **Las credenciales MTProto** se guardan en tu `.env` (nunca en el repo, está en `.gitignore`)
- **La sesión de Telegram** se guarda en `~/.mks-telegram-bot/session.txt` (fuera del repo)
- **El bot token** se guarda en el `.env` del entorno correspondiente

> **IMPORTANTE**: Nunca commits los archivos `.env.*` ni la sesión.

## Referencias

- [Getting Started](./getting-started.md) - Guía de inicio
- [Environment](./environment.md) - Variables de entorno
- [Development](./development.md) - Flujo de desarrollo
