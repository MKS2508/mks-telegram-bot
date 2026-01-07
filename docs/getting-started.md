# Getting Started

Guía paso a paso para configurar y ejecutar tu bot de Telegram.

## Prerrequisitos

Antes de comenzar, asegúrate de tener:

- **Bun** v1.3+ - Instalar desde [bun.sh](https://bun.sh)
- **Cuenta de Telegram** - Para crear el bot
- **Editor de código** - VS Code recomendado

Verifica tu instalación:

```bash
bun --version
```

## Paso 1: Crear el Bot en Telegram

> **OPCIÓN RECOMENDADA: Bootstrap Automático**
>
> Si quieres automatizar TODO el proceso (crear bot, grupo, topics), salta a [Paso 4: Bootstrap Automático](#paso-4-bootstrap-automtico).

### Hablar con @BotFather (Método Manual)

1. Abre Telegram y busca **@BotFather**
2. Inicia el chat con el comando `/newbot`
3. Sigue las instrucciones:
   - **Nombre del bot**: `Mi Bot Increíble`
   - **Username**: `mi_increible_bot` (debe terminar en "bot")

4. **Copia el token** que te da @BotFather:
   ```
   123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   ```

> **Guarda el token en un lugar seguro**. Es la llave de acceso a tu bot.

## Paso 2: Instalar el Template

### Opción A: Clonar desde GitHub

```bash
git clone <tu-repo-url>
cd mks-telegram-bot
```

### Opción B: Usar como Template

1. Ve al repositorio en GitHub
2. Click en "Use this template" → "Create a new repository"
3. Clona tu nuevo repositorio

## Paso 3: Instalar Dependencias

```bash
bun install
```

Esto instala todas las dependencias del workspace:
- `core/` - Bot principal
- `packages/utils/` - Utilidades compartidas
- `tools/` - CLI tools

## Paso 4: Configurar el Entorno

### 🌟 Opción Recomendada: Bootstrap Multibot

El template ahora soporta **múltiples bots** desde un mismo proyecto. Usa el comando `bootstrap` para configurar todo automáticamente:

```bash
# Bootstrap interactivo completo (recomendado)
bun run bootstrap

# Listar bots disponibles desde BotFather
bun run bootstrap --list

# Usar bot específico
bun run bootstrap --bot mybot123bot

# Reutilizar configuración existente sin prompts
bun run bootstrap --reuse
```

El bootstrap te guiará paso a paso:

1. **Credenciales API** (si no las tienes): Tu API ID y Hash de https://my.telegram.org
2. **Bot Selection**: Crear nuevo bot o reutilizar uno existente
3. **Group Selection**: Crear nuevo grupo/forum o reutilizar existente
4. **Topics Selection**: Crear topics para organización (Control, Logs, Config, Bugs)
5. **Listo!**: Tu bot está configurado y listo para usar

### Opción Manual: Setup Interactivo

```bash
bun run setup
```

El comando te preguntará:

1. **Bot Token** - Pega el token de @BotFather
2. **Modo de operación** - Selecciona "polling" para desarrollo
3. **Entorno** - "local" para desarrollo
4. **Streaming de logs** - Opcional, para ver logs en Telegram
5. **Comandos de control** - Opcional, para comandos admin

### Opción Manual Avanzada: Editar Archivo .env

> **NOTA**: El sistema ahora usa la estructura `.envs/{bot}/{environment}.env` para multibot.

```bash
# Crear directorio para tu bot
mkdir -p core/.envs/mybot123bot

# Crear archivo de entorno local
cat > core/.envs/mybot123bot/local.env << 'EOF'
# Required
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TG_MODE=polling
TG_ENV=local
EOF
```

### Sistema Multibot

El template soporta gestión de **múltiples bots** desde un mismo proyecto:

#### Estructura de Directorios

```
core/.envs/
├── mybot123bot/
│   ├── local.env       # Configuración local
│   ├── staging.env     # Configuración staging
│   ├── production.env  # Configuración production
│   └── metadata.json   # Metadatos del bot
├── anotherbot456bot/
│   ├── local.env
│   ├── staging.env
│   └── production.env
└── .active -> mybot123bot  # Symlink al bot activo
```

#### Comandos de Gestión de Bots

```bash
# Listar todos los bots configurados
bun run bot list

# Establecer bot activo
bun run bot use mybot123bot

# Ver información detallada de un bot
bun run bot info mybot123bot

# Eliminar configuración de un bot
bun run bot delete mybot123bot

# Migrar .envs antiguos a nueva estructura
bun run bot migrate
```

#### Selección de Bot Activo

Hay tres formas de seleccionar el bot activo:

1. **Vía symlink .active** (automático con `bot use`):
```bash
bun run bot use mybot123bot
```

2. **Vía variable de entorno**:
```bash
TG_BOT=mybot123bot bun run dev
```

3. **Automático**: El bot configurado más recientemente se activa automáticamente

### Opción Automática: Bootstrap Completo (Método Anterior)

> **"BotFather Personal"** - Automatiza TODO el proceso de creación

Si no has creado el bot todavía, puedes usar `bootstrap` para:

1. **Crear el bot automáticamente** vía @BotFather
2. **Crear un grupo/forum** para el bot
3. **Añadir el bot como admin** del grupo
4. **Crear topics** automáticamente (General, Control, Logs, Config, Bugs)
5. **Configurar todos los IDs** en el `.env`

```bash
# Requiere credenciales MTProto API (ver abajo)
bun run bootstrap
```

<details>
<summary>💡 ¿Cómo obtener credenciales MTProto API?</summary>

1. Ve a [https://my.telegram.org](https://my.telegram.org)
2. Log in con tu número de teléfono
3. Click en "API development tools"
4. Llena el formulario:
   - **App title**: My Bot App
   - **Short name**: mybotapp
   - **Platform**: Desktop o Web
5. Click "Create application"
6. Copia el `api_id` y `api_hash`

> Puedes guardar estas credenciales en tu `.env` para evitar re-pedirlas:
> ```bash
> # MTProto API Credentials (for bootstrap command)
> TG_API_ID=12345678
> TG_API_HASH=abc123def456789...
> ```

</details>

**Ventajas del Bootstrap:**

| Feature | Bootstrap | Manual |
|---------|-----------|--------|
| Tiempo total | ~3-5 minutos | ~10-15 minutos |
| Creación de bot | Automático | Hablar con @BotFather |
| Creación de grupo | Automático | Manual en Telegram |
| Creación de topics | Automática | Manual o comando separado |
| IDs detection | Automático | Requiere auto-configure |

> **Ver documentación completa**: [CLI Commands - Bootstrap](./cli-commands.md#bootstrap-command)

## Paso 5: Verificar Configuración

> **ALTAMENTE RECOMENDADO** después de setup

```bash
bun run doctor
```

Este comando diagnostica tu configuración y valida que todo esté correcto:

### Checks que Realiza

| Check | Descripción |
| ----- | ----------- |
| ✓ Node.js version | Versión >= 20 |
| ✓ Bun installation | Bun está instalado |
| ✓ Dependencies | Todas las dependencias instaladas |
| ✓ Environment files | Archivos .env existen |
| ✓ Environment variables | Variables requeridas seteadas |
| ✓ Bot token validation | Token válido contra Telegram API |
| ✓ Control commands | Configuración de comandos de control |
| ✓ Temp directory | core/tmp es writable |
| ✓ Logs directory | core/logs existe |
| ✓ Port availability | Puerto 3000 disponible |
| ✓ Git ignore | .env files excluidos de git |

### Output Esperado

Deberías ver:

```
✓ Node.js version        Node.js v20.x.x (requires >= 20)
✓ Bun installation       Bun is installed
✓ Dependencies           All dependencies installed
✓ Environment files      Found: .env.local
✓ Environment variables  Required variables set
✓ Bot token validation   Bot token is valid
✓ Temp directory         core/tmp is writable
✓ Port availability      Port 3000 is available
```

## Paso 6: Arrancar el Bot

### Modo Desarrollo (con Hot Reload)

```bash
bun run dev
```

El bot arrancará en modo polling con hot reload:

```
[Bot] Bot started successfully
[Bot] Mode: polling
[Bot] Environment: local
```

### Modo Producción

```bash
bun run start
```

## Paso 7: Probar el Bot

### Enviar Comandos Básicos

Abre Telegram y busca tu bot (o usa el link que te dio @BotFather).

Envía estos comandos:

- `/start` - Mensaje de bienvenida
- `/health` - Estado del bot
- `/uptime` - Tiempo de ejecución
- `/stats` - Estadísticas

### Respuesta Esperada

```
┌────────────────────────────────┐
│  🤖 mks-telegram-bot           │
│                                │
│  ¡Hola! Soy tu bot de Telegram │
│  configurado con el template   │
│                                │
│  Comandos disponibles:         │
│  /start  - Iniciar el bot      │
│  /health - Estado de salud     │
│  /uptime  - Tiempo activo      │
│  /stats   - Estadísticas       │
└────────────────────────────────┘
```

## Siguientes Pasos

### Aprende Más

- [Environment](./environment.mdx) - Configuración de variables
- [CLI Commands](./docs/cli-commands.md) - Comandos disponibles
- [Development](./docs/development.md) - Flujo de desarrollo

### Personaliza tu Bot

1. **Agregar comandos** - Ver [Development Guide](../CLAUDE.dev.md)
2. **Configurar logging** - Ver [Environment](./environment.mdx)
3. **Deploy a producción** - Ver [Deployment Guide](../CLAUDE.deploy.md)

### Troubleshooting

Si algo no funciona:

- El bot no responde → Revisa el token y el modo
- Error de conexión → Verifica que `TG_MODE=polling`
- Puerto en uso → Cambia el puerto o mata el proceso

Ver [Troubleshooting](./troubleshooting.mdx) para más detalles.

## Resumen Rápido

### Flujo Manual (con bot ya creado)

```bash
# 1. Clonar el template
git clone <repo>
cd mks-telegram-bot

# 2. Instalar dependencias
bun install

# 3. Configurar entorno (setup interactivo)
bun run setup

# 4. Verificar configuración (recomendado)
bun run doctor

# 5. Arrancar en desarrollo
bun run dev

# 6. Probar en Telegram
# Envía /start a tu bot
```

### Flujo Automático (Bootstrap)

```bash
# 1. Clonar el template
git clone <repo>
cd mks-telegram-bot

# 2. Instalar dependencias
bun install

# 3. Obtener credenciales MTProto (my.telegram.org)
# TG_API_ID=12345678
# TG_API_HASH=abc123def456789...

# 4. Bootstrap automático (crea bot, grupo, topics)
bun run bootstrap

# 5. Verificar configuración (recomendado)
bun run doctor

# 6. Arrancar en desarrollo
bun run dev

# 7. Probar en Telegram
# Envía /start a tu bot
```

> **¿Cuál usar?**
> - **Bootstrap** - Si no has creado el bot todavía (~3-5 min total)
> - **Manual** - Si ya tienes el token de @BotFather (~10-15 min total)
> - **Siempre** ejecuta `bun run doctor` después del setup para verificar


## Referencias

- **@BotFather** - [@BotFather en Telegram](https://t.me/BotFather)
- **Telegram Bot API** - [Documentación oficial](https://core.telegram.org/bots/api)
- **Bun** - [bun.sh](https://bun.sh)
