# mks-telegram-bot

> Template monorepo para bots de Telegram con Bun, Telegraf y TypeScript

[![Use this template](https://img.shields.io/badge/Use%20this-template-blue?style=for-the-badge)](https://github.com/MKS2508/mks-telegram-bot/generate)

Template listo para producción con soporte **multibot**, multi-entorno, multi-instancia, y las mejores prácticas de desarrollo.

## Características Principales

- 🤖 **Multibot**: Gestiona múltiples bots desde un mismo proyecto
- 🌍 **Multi-entorno**: local, staging, production para cada bot
- 🔄 **Idempotente**: Reutiliza bots existentes sin recrearlos
- 🎯 **Bootstrap interactivo**: Configuración guiada paso a paso via [@mks2508/telegram-bot-manager](https://www.npmjs.com/package/@mks2508/telegram-bot-manager)
- ✅ **BotFather integrado**: Lista y reutiliza bots creados

## Quick Start (5 min)

### Opción A: Bootstrap Automático (Recomendado)

Usa `@mks2508/telegram-bot-manager` para crear automáticamente el bot, grupo/forum y topics:

```bash
# Usar el template
# Click en "Use this template" arriba → Create a new repository
# O con CLI: gh repo create my-bot --template MKS2508/mks-telegram-bot

# Clonar tu nuevo repo
git clone https://github.com/TU_USUARIO/my-bot.git
cd my-bot

# Instalar dependencias
bun install

# Bootstrap interactivo (crea bot, grupo, topics y configura .env)
bunx @mks2508/telegram-bot-manager bootstrap
```

El comando `bootstrap` te guiará paso a paso:
1. **Credenciales API**: Tu API ID y Hash de https://my.telegram.org
2. **Bot Selection**: Crear nuevo o reutilizar bot existente
3. **Group Selection**: Crear nuevo o reutilizar grupo/forum existente
4. **Topics Selection**: Crear topics para organización (Control, Logs, Config, Bugs)
5. **Listo!**: Tu bot está configurado y listo para usar

### Opción B: Configuración Manual

Si prefieres configurar manualmente:

#### 1. Crear el Bot

Habla con [@BotFather](https://t.me/BotFather) en Telegram:

```
/newbot
 Nombre: MyBot
 Username: my_awesome_bot
 Copia el token (ej: 123456:ABC-DEF1234...)
```

#### 2. Setup Manual

```bash
# Setup interactivo (crea .env.local)
bun run setup
```

El comando `setup` te preguntará:
- Bot token (pega el token de @BotFather)
- Modo (polling para desarrollo)
- Comandos de control (requiere tu User ID)

#### Obtener tu Telegram User ID

1. **Opción 1**: Enviar `/getinfo` al bot después de arrancarlo
2. **Opción 2**: Hablar con [@userinfobot](https://t.me/userinfobot) en Telegram

### 3. Arrancar en Desarrollo

```bash
bun run dev
```

### 4. Probar

Envía `/start` o `/health` a tu bot en Telegram.

## Comandos CLI

### Bot Management (via bunx/npx)

Usa `@mks2508/telegram-bot-manager` para gestionar bots:

```bash
# Bootstrap interactivo completo
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

# Crear topics
bunx @mks2508/telegram-bot-manager topics
```

### Comandos Locales

| Comando | Descripción |
| ------- | ----------- |
| `bun run dev` | Desarrollo con hot reload |
| `bun run start` | Producción |
| `bun run setup` | Setup manual de entorno |
| `bun run doctor` | Diagnóstico de configuración |
| `bun run ngrok` | Túnel ngrok para webhooks |
| `bun run typecheck` | Type check con tsgo |
| `bun run lint` | Lint con oxlint |
| `bun run format` | Format con prettier |
| `bun run test` | Ejecutar tests |

### Scripts de Entorno

| Comando | Descripción |
| ------- | ----------- |
| `bun run setup:staging` | Setup para entorno staging |
| `bun run setup:production` | Setup para producción |
| `TG_ENV=staging bun run dev` | Dev con entorno staging |

## Sistema Multibot

El template soporta gestión de múltiples bots desde un mismo proyecto:

### Estructura de Directorios

```
core/.envs/
├── {botUsername}/
│   ├── local.env       # Configuración local del bot
│   ├── staging.env     # Configuración staging del bot
│   ├── production.env  # Configuración production del bot
│   └── metadata.json   # Metadatos del bot
└── .active -> {botUsername}  # Symlink al bot activo
```

### Selección de Bot Activo

1. **Vía comando** (recomendado):
```bash
bunx @mks2508/telegram-bot-manager bot use mybot123bot
```

2. **Vía variable de entorno**:
```bash
TG_BOT=mybot123bot bun run dev
```

### Workflow Típico

```bash
# 1. Listar bots disponibles desde BotFather
bunx @mks2508/telegram-bot-manager bootstrap --list

# 2. Bootstrap nuevo bot o importar existente
bunx @mks2508/telegram-bot-manager bootstrap

# 3. Listar bots configurados localmente
bunx @mks2508/telegram-bot-manager bot list

# 4. Cambiar bot activo
bunx @mks2508/telegram-bot-manager bot use anotherbot

# 5. Desarrollar
bun run dev
```

## Estructura del Proyecto

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
│   │   ├── config/          # Configuration & env validation
│   │   ├── handlers/        # Command handlers
│   │   ├── middleware/      # Telegraf middleware
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utilities (instance-manager, etc.)
│   ├── logs/               # Log files
│   ├── tmp/                # Instance lock files
│   └── .env.example        # Template de variables
├── tools/                  # CLI tools locales
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
├── CLAUDE.md               # Entry point para Claude
├── CLAUDE.dev.md           # Guía de desarrollo
└── CLAUDE.deploy.md        # Guía de deployment
```

## Stack Tecnológico

| Herramienta | Versión | Uso |
| ----------- | ------- | --- |
| **Bun** | 1.3+ | Runtime & package manager |
| **TypeScript** | 5.9+ | Lenguaje |
| **Telegraf** | 4.16+ | Telegram Bot API |
| **Zod** | 3.24+ | Schema validation |
| **tsgo** | native-preview | Type checking (~10x más rápido) |
| **oxlint** | latest | Linting |
| **prettier** | 3.4+ | Formatting |
| **@inquirer/prompts** | latest | Interactive CLI prompts |
| **ora** | latest | CLI spinners |

### Paquete Externo para Bot Management

| Paquete | Versión | Uso |
| ------- | ------- | --- |
| **@mks2508/telegram-bot-manager** | 0.1.1+ | BotFather automation, multibot management |

## Bot Commands

### Public Commands

| Comando | Descripción |
| ------- | ----------- |
| `/start` | Welcome message |
| `/health` | Health check |
| `/uptime` | Uptime info |
| `/stats` | Statistics |
| `/getinfo` | Tu User ID, Chat ID, Topic ID |
| `/logs` | Log streaming status |

### Control Commands (requieren autorización)

| Comando | Descripción |
| ------- | ----------- |
| `/stop` | Graceful shutdown |
| `/restart` | Restart con stats reset |
| `/mode` | Switch polling/webhook |
| `/webhook` | Webhook configuration |

## Organización con Topics

El bot soporta **Forum Topics** para mantener el chat organizado:

```
📊 General     - Chat general, comandos públicos
🤖 Control     - Comandos de control (/stop, /restart, /mode)
📋 Logs        - Streaming de logs del bot
⚙️ Config      - Discusiones de configuración
🐛 Bugs        - Reporte de bugs
```

**Configuración:**

```bash
# .env.local
TG_AUTHORIZED_USER_IDS=123456789
TG_CONTROL_CHAT_ID=-1001234567890
TG_CONTROL_TOPIC_ID=12345       # Solo comandos de control en este topic

TG_LOG_CHAT_ID=-1001234567890
TG_LOG_TOPIC_ID=67890           # Logs van a este topic
```

## Development Workflow

```bash
# 1. Instalar dependencias
bun install

# 2. Bootstrap (recomendado)
bunx @mks2508/telegram-bot-manager bootstrap

# 3. Verificar configuración
bun run doctor

# 4. Desarrollar
bun run dev

# 5. Antes de commitear
bun run build  # typecheck + lint
bun test
```

### Code Style

- TypeScript strict mode
- Semi: false, singleQuote: true
- Result type pattern para error handling
- Logger estructurado (no console.*)

## Deployment

### Docker

```bash
# Build
docker build -t mks-telegram-bot .

# Run
docker-compose up bot-production
```

### Multi-Instancia

El template detecta conflictos de instancias:

```bash
# Ver instancias corriendo
bun run cli status

# Iniciar en entorno específico
TG_ENV=staging bun run start
```

Ver [CLAUDE.deploy.md](./CLAUDE.deploy.md) para guía completa.

## Documentación

| Documento | Descripción |
| --------- | ----------- |
| [Getting Started](./docs/getting-started.md) | Guía de inicio paso a paso |
| [Environment](./docs/environment.md) | Variables de entorno |
| [CLI Commands](./docs/cli-commands.md) | Comandos CLI disponibles |
| [Development](./docs/development.md) | Flujo de desarrollo |
| [Troubleshooting](./docs/troubleshooting.md) | Problemas comunes |

**Para Claude:**
- [CLAUDE.md](./CLAUDE.md) - Entry point principal
- [CLAUDE.dev.md](./CLAUDE.dev.md) - Guía de desarrollo
- [CLAUDE.deploy.md](./CLAUDE.deploy.md) - Deployment y entornos

## License

MIT

## Autor

[@mks2508](https://github.com/mks2508)
