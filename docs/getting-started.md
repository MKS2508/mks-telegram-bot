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

### Hablar con @BotFather

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

### Opción Recomendada: Setup Interactivo

```bash
bun run setup
```

El comando te preguntará:

1. **Bot Token** - Pega el token de @BotFather
2. **Modo de operación** - Selecciona "polling" para desarrollo
3. **Entorno** - "local" para desarrollo
4. **Streaming de logs** - Opcional, para ver logs en Telegram
5. **Comandos de control** - Opcional, para comandos admin

### Opción Manual: Editar Archivo .env

```bash
cp core/.env.example core/.env.local
nano core/.env.local
```

Edita las variables mínimas:

```bash
# Required
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TG_MODE=polling
TG_ENV=local
```

## Paso 5: Verificar Configuración

```bash
bun run doctor
```

Este comando diagnostica tu configuración:

- ✓ Dependencias instaladas
- ✓ Archivos .env configurados
- ✓ Token de bot válido
- ✓ Puertos disponibles

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

```bash
# 1. Clonar el template
git clone <repo>
cd mks-telegram-bot

# 2. Instalar dependencias
bun install

# 3. Configurar entorno (setup interactivo)
bun run setup

# 4. Verificar configuración
bun run doctor

# 5. Arrancar en desarrollo
bun run dev

# 6. Probar en Telegram
# Envía /start a tu bot
```

## Referencias

- **@BotFather** - [@BotFather en Telegram](https://t.me/BotFather)
- **Telegram Bot API** - [Documentación oficial](https://core.telegram.org/bots/api)
- **Bun** - [bun.sh](https://bun.sh)
