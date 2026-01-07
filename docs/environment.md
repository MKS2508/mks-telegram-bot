# Environment Configuration

Guía completa de configuración de variables de entorno para el bot.

## Archivos de Entorno

El template soporta múltiples entornos con archivos `.env` separados:

### Estructura Multibot (Nueva)

> **Sistema Multibot**: Gestiona múltiples bots desde un mismo proyecto con configuraciones independientes.

El template ahora usa una estructura `.envs/` para soportar múltiples bots:

```
core/.envs/
├── {botUsername}/
│   ├── local.env       # Configuración local del bot
│   ├── staging.env     # Configuración staging del bot
│   ├── production.env  # Configuración production del bot
│   └── metadata.json   # Metadatos del bot
└── .active -> {botUsername}  # Symlink al bot activo
```

### Estructura Legada (Antigua)

Para backwards compatibility, el template todavía soporta la estructura antigua:

| Archivo | Uso | Modo | Bot Token |
| ------- | --- | ---- | --------- |
| `core/.env.local` | Desarrollo local | Polling | Local dev token |
| `core/.env.staging` | Testing/Staging | Webhook | Test bot token |
| `core/.env.production` | Producción | Webhook | Real bot token |

### Selección de Bot Activo

En la estructura multibot, hay tres formas de seleccionar el bot activo:

#### 1. Vía Symlink .active (Automático)

```bash
bun run bot use mybot123bot
```

Esto crea/actualiza el symlink `.active` para apuntar al bot seleccionado.

#### 2. Vía Variable de Entorno TG_BOT

```bash
TG_BOT=mybot123bot bun run dev
```

#### 3. Automático

El bot configurado más recientemente se activa automáticamente.

### Migración desde Estructura Antigua

Si tienes archivos `.env.{env}` antiguos, puedes migrarlos a la nueva estructura:

```bash
bun run bot migrate
```

Este comando:
- Detecta archivos `.env.local`, `.env.staging`, `.env.production`
- Crea la estructura `.envs/{bot}/{env}.env`
- Hace backup de archivos antiguos como `.env.{env}.backup`
- Actualiza el symlink `.active`

### Selección de Entorno

La variable `TG_ENV` determina cuál archivo cargar:

```bash
# Default: local (carga .env.local)
bun run start

# Staging
TG_ENV=staging bun run start

# Production
TG_ENV=production bun run start
```

## Variables Requeridas

### `TG_BOT_TOKEN`

**Descripción**: Token de acceso al bot desde @BotFather

**Formato**: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`

**Obtenerlo**:
1. Habla con [@BotFather](https://t.me/BotFather)
2. `/newbot`
3. Copia el token proporcionado

**Ejemplo**:
```bash
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

### `TG_MODE`

**Descripción**: Modo de operación del bot

**Opciones**:
- `polling` - El bot pregunta por updates (recomendado para desarrollo)
- `webhook` - Telegram envía updates a una URL (recomendado para producción)

**Ejemplo**:
```bash
TG_MODE=polling
```

## Variables MTProto (para Bootstrap)

### `TG_API_ID`

**Descripción**: API ID de Telegram para MTProto (obtenido de my.telegram.org)

**Requerido para**: `bun run bootstrap` (comando de creación automática de bots)

**Obtenerlo**:
1. Ve a [https://my.telegram.org](https://my.telegram.org)
2. Log in con tu número de teléfono
3. Click en "API development tools"
4. Llena el formulario (App title, Short name, Platform)
5. Click "Create application"
6. Copia el `api_id` (número entero)

**Formato**: Número entero positivo

**Ejemplo**:
```bash
TG_API_ID=12345678
```

### `TG_API_HASH`

**Descripción**: API Hash de Telegram para MTProto (obtenido de my.telegram.org)

**Requerido para**: `bun run bootstrap` (comando de creación automática de bots)

**Formato**: String de 32+ caracteres

**Ejemplo**:
```bash
TG_API_HASH=abc123def456789abc123def456789ab
```

> **IMPORTANTE**: Estas credenciales son diferentes del bot token.
> - **Bot Token** (TG_BOT_TOKEN): Para Bot API, usado en runtime
> - **MTProto Credentials** (TG_API_ID/TG_API_HASH): Para crear bots automáticamente vía @BotFather

**Uso en Bootstrap**:
```bash
# Con credenciales en .env, bootstrap no te las pedirá
bun run bootstrap

# Sin credenciales, bootstrap te pedirá que las ingreses
bun run bootstrap
# → Enter your API ID: ********
# → Enter your API Hash: ************************************
```

**Seguridad**:
- Guarda estas credenciales en tu `.env` (nunca en el repo)
- Son menos sensibles que el bot token, pero aún así privadas
- Permiten que el bootstrainer automatice la creación de bots

## Variables Webhook (si TG_MODE=webhook)

### `TG_WEBHOOK_URL`

**Descripción**: URL pública HTTPS donde Telegram enviará updates

**Requerido**: Solo si `TG_MODE=webhook`

**Validación**: Debe ser HTTPS y públicamente accesible

**Ejemplo**:
```bash
TG_WEBHOOK_URL=https://mybot.example.com/webhook
```

### `TG_WEBHOOK_SECRET`

**Descripción**: Token secreto para validar webhooks

**Requerido**: Solo si `TG_MODE=webhook`

**Restricción**: Mínimo 16 caracteres

**Ejemplo**:
```bash
TG_WEBHOOK_SECRET=my_secret_token_min_16_chars
```

## Variables de Identificación

### `TG_BOT`

**Descripción**: Username del bot a activar (sistema multibot)

**Formato**: Bot username sin el `@`

**Ejemplo**:
```bash
TG_BOT=mybot123bot
```

**Uso**:
```bash
# Arrancar bot específico
TG_BOT=mybot123bot bun run dev

# Arrancar otro bot
TG_BOT=anotherbot456bot bun run dev
```

**Alternativas**:
- Usar `bun run bot use <username>` para establecer bot activo permanentemente
- El symlink `.active` se usa automáticamente si `TG_BOT` no está seteado

### `TG_ENV`

**Descripción**: Entorno actual del bot

**Opciones**: `local`, `staging`, `production`

**Default**: `local`

**Ejemplo**:
```bash
TG_ENV=local
```

### `TG_INSTANCE_NAME`

**Descripción**: Nombre único de la instancia (para multi-instancia)

**Default**: `mks-bot`

**Ejemplo**:
```bash
TG_INSTANCE_NAME=my-awesome-bot
```

## Variables de Control (Opcional)

### `TG_LOG_CHAT_ID` / `TG_LOG_TOPIC_ID`

**Descripción**: Chat y topic para streaming de logs

**Uso**: Los logs del bot se envían a este chat/topic

**Obtener chat ID**:
1. Añade el bot a un grupo
2. Envía un mensaje
3. Usa `bun run cli status` para ver updates
4. O usa [@GetTelegraphBot](https://t.me/GetTelegraphBot)

**Ejemplo**:
```bash
TG_LOG_CHAT_ID=-1001234567890
TG_LOG_TOPIC_ID=123
```

### `TG_CONTROL_CHAT_ID` / `TG_CONTROL_TOPIC_ID`

**Descripción**: Chat y topic para comandos de control

**Uso**: Comandos como `/stop`, `/restart`, `/mode`

**Ejemplo**:
```bash
TG_CONTROL_CHAT_ID=-1001234567890
TG_CONTROL_TOPIC_ID=124
```

### `TG_AUTHORIZED_USER_IDS`

**Descripción**: IDs de usuarios autorizados para comandos de control

**Formato**: Comma-separated list

**Obtener user ID**:
1. Envía un mensaje al bot
2. Usa `bun run cli status --json`
3. Busca `from.id` en el update

**Ejemplo**:
```bash
TG_AUTHORIZED_USER_IDS=123456789,987654321
```

## Variables de Logging

### `LOG_LEVEL`

**Descripción**: Nivel de verbose del logging

**Opciones**:
- `debug` - Muy detallado (desarrollo)
- `info` - Información general (default)
- `warn` - Solo warnings
- `error` - Solo errores

**Ejemplo**:
```bash
LOG_LEVEL=info
```

### `TG_DEBUG`

**Descripción**: Habilita modo debug

**Default**: `false`

**Ejemplo**:
```bash
TG_DEBUG=true
```

## Variables de Multi-Instancia

### `TG_INSTANCE_CHECK`

**Descripción**: Habilita detección de conflictos de instancia

**Default**: `true`

**Ejemplo**:
```bash
TG_INSTANCE_CHECK=true
```

### `TG_LOCK_BACKEND`

**Descripción**: Backend para lock de instancias

**Opciones**:
- `pid` - Archivos PID (default)
- `redis` - Redis para multi-servidor

**Ejemplo**:
```bash
TG_LOCK_BACKEND=pid
```

### `TG_REDIS_URL`

**Descripción**: URL de Redis (si `TG_LOCK_BACKEND=redis`)

**Ejemplo**:
```bash
TG_REDIS_URL=redis://localhost:6379
```

## Variables de ngrok

### `TG_NGROK_ENABLED`

**Descripción**: Habilita integración con ngrok

**Default**: `false`

**Ejemplo**:
```bash
TG_NGROK_ENABLED=true
```

### `TG_NGROK_PORT`

**Descripción**: Puerto a forward con ngrok

**Default**: `3000`

**Ejemplo**:
```bash
TG_NGROK_PORT=3000
```

### `TG_NGROK_REGION`

**Descripción**: Región de ngrok

**Opciones**: `us`, `eu`, `ap`, `au`, `sa`, `jp`, `in`

**Default**: `us`

**Ejemplo**:
```bash
TG_NGROK_REGION=eu
```

## Variables de File Logging

### `TG_LOG_FILE_ENABLED`

**Descripción**: Habilita logging a archivos

**Default**: `true`

**Ejemplo**:
```bash
TG_LOG_FILE_ENABLED=true
```

### `TG_LOG_DIR`

**Descripción**: Directorio para archivos de log

**Default**: `./logs`

**Ejemplo**:
```bash
TG_LOG_DIR=./var/log
```

### `TG_LOG_MAX_SIZE`

**Descripción**: Tamaño máximo de archivo de log (bytes)

**Default**: `1048576` (1MB)

**Ejemplo**:
```bash
TG_LOG_MAX_SIZE=5242880
```

### `TG_LOG_MAX_FILES`

**Descripción**: Número máximo de archivos a mantener

**Default**: `5`

**Ejemplo**:
```bash
TG_LOG_MAX_FILES=10
```

### `TG_LOG_LEVELS`

**Descripción**: Niveles a loggear en archivos

**Default**: `info,warn,error,critical`

**Ejemplo**:
```bash
TG_LOG_LEVELS=debug,info,warn,error,critical
```

## Variables de Rate Limiting

### `TG_RATE_LIMIT`

**Descripción**: Máximo de mensajes por minuto

**Default**: `60`

**Rango**: 1-120

**Ejemplo**:
```bash
TG_RATE_LIMIT=30
```

## Variables de Timeout

### `TG_TIMEOUT`

**Descripción**: Timeout de respuesta de comandos (ms)

**Default**: `5000`

**Mínimo**: `1000`

**Ejemplo**:
```bash
TG_TIMEOUT=10000
```

### `TG_MAX_RETRIES`

**Descripción**: Máximo de reintentos para operaciones

**Default**: `3`

**Rango**: 1-10

**Ejemplo**:
```bash
TG_MAX_RETRIES=5
```

## Seguridad

### Nunca Commitear .env Files

Los archivos `.env.*` y el directorio `.envs/` contienen secrets y no deben estar en git.

```gitignore
# En .gitignore
core/.env.local
core/.env.staging
core/.env.production
core/.env.*

# Multibot environment directory
core/.envs/
core/.envs/*/
!core/.envs/.gitkeep
```

### Usar .env.example

El archivo `.env.example` tiene placeholders seguros:

```bash
# Ejemplo seguro
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# NUNCA comitear un token real
# TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11  # ❌ MAL
```

### Variables de Entorno en Producción

En producción, usa secretos de tu plataforma:

- **Vercel**: Environment Variables
- **Railway**: Variables
- **Docker**: `--env-file` o `-e`
- **Kubernetes**: Secrets

```bash
# Docker
docker run -e TG_BOT_TOKEN=xxx -e TG_MODE=webhook ...

# Kubernetes
kubectl create secret generic bot-secrets --from-literal=TG_BOT_TOKEN=xxx
```

## Plantillas de Entorno

### Estructura Multibot

Para sistemas multibot, cada bot tiene su propio directorio con archivos de entorno:

```bash
# core/.envs/mybot123bot/local.env
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TG_MODE=polling
TG_ENV=local
LOG_LEVEL=debug
TG_DEBUG=true

# core/.envs/mybot123bot/staging.env
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TG_MODE=webhook
TG_WEBHOOK_URL=https://staging.example.com/webhook
TG_WEBHOOK_SECRET=staging_secret_min_16_chars
TG_ENV=staging
LOG_LEVEL=info

# core/.envs/mybot123bot/production.env
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TG_MODE=webhook
TG_WEBHOOK_URL=https://bot.example.com/webhook
TG_WEBHOOK_SECRET=super_secure_secret_min_16_chars
TG_ENV=production
LOG_LEVEL=warn
TG_RATE_LIMIT=30

# core/.envs/mybot123bot/metadata.json
{
  "name": "My Bot",
  "description": "My awesome Telegram bot",
  "createdAt": "2025-01-07T14:30:45.000Z",
  "updatedAt": "2025-01-07T15:15:22.000Z",
  "tags": ["test", "demo"]
}
```

### Estructura Legada (Archivos Únicos)

Para proyectos con un solo bot, puedes usar archivos de entorno únicos:

#### Desarrollo (.env.local)

```bash
# Required
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TG_MODE=polling
TG_ENV=local

# MTProto (opcional - para comando bootstrap)
# TG_API_ID=12345678
# TG_API_HASH=abc123def456789...

# Logging
LOG_LEVEL=debug
TG_DEBUG=true
```

#### Staging (.env.staging)

```bash
# Required
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TG_MODE=webhook
TG_WEBHOOK_URL=https://staging.example.com/webhook
TG_WEBHOOK_SECRET=staging_secret_min_16_chars
TG_ENV=staging

# Logging
LOG_LEVEL=info
TG_LOG_CHAT_ID=-1001234567890
TG_LOG_TOPIC_ID=123
```

### Producción (.env.production)

```bash
# Required
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TG_MODE=webhook
TG_WEBHOOK_URL=https://bot.example.com/webhook
TG_WEBHOOK_SECRET=super_secure_secret_min_16_chars
TG_ENV=production

# Logging (minimal in production)
LOG_LEVEL=warn
TG_LOG_CHAT_ID=-1001234567890
TG_LOG_TOPIC_ID=456

# Rate limiting
TG_RATE_LIMIT=30
```

## Referencias

- [Getting Started](./getting-started.md) - Guía de inicio
- [CLI Commands](./cli-commands.md) - Comandos disponibles
- [Deployment Guide](../CLAUDE.deploy.md) - Deployment completo
