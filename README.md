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
| **Better Logger** | Logging                   |
| **tsgo**          | Type checking             |
| **oxlint**        | Linting                   |
| **prettier**      | Formatting                |

## Scripts

```bash
bun run dev           # Dev mode con watch
bun run start         # Production
bun run typecheck     # Type check con tsgo
bun run lint          # Lint con oxlint
bun run format        # Format con prettier
```

## Features

- Result type pattern para error handling
- Soporte polling y webhook
- Health/stats/control commands
- Log streaming a Telegram
- Authorization system
- Topic support
