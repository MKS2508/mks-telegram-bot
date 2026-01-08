# CLAUDE.deploy.md - Guía de Deployment

> **Parte de**: [CLAUDE.md](./CLAUDE.md) | Ver también: [CLAUDE.dev.md](./CLAUDE.dev.md)

Guía de deployment para multi-entorno y multi-instancia.

**Documentación relacionada**:
- [docs/environment.md](./docs/environment.md)
- [docs/troubleshooting.md](./docs/troubleshooting.md)

---

## Multi-Environment Architecture

El template soporta múltiples entornos con archivos `.env` separados:

### Archivos de Entorno

| Archivo | Uso | Modo | Bot Token |
| ------- | --- | ---- | --------- |
| `core/.env.local` | Desarrollo local | Polling | Local dev token |
| `core/.env.staging` | Testing/Staging | Webhook | Test bot token |
| `core/.env.production` | Producción | Webhook | Real bot token |

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

---

## Multi-Instance Management

### Sistema de Lock

El `InstanceManager` previene conflictos usando archivos PID/LOCK en `core/tmp/`:

```
core/tmp/
├── mks-bot-local.pid     # Process ID
├── mks-bot-local.lock    # Lock data (JSON)
├── mks-bot-staging.pid
└── mks-bot-staging.lock
```

### Contenido del Lock File

```json
{
  "pid": 12345,
  "instanceId": "1734567890-abc123",
  "environment": "production",
  "instanceName": "mks-bot-prod",
  "startTime": "2025-01-06T10:30:00.000Z",
  "nodeVersion": "v1.3.0",
  "cwd": "/app"
}
```

### Detección de Conflictos

Al iniciar, el bot verifica si otra instancia está corriendo:

- **Si está corriendo**: Error `INSTANCE_CONFLICT` con detalles
- **Si no está corriendo**: Remueve lock stale y continua
- **Si está deshabilitado**: `TG_INSTANCE_CHECK=false` salta verificación

### Ver Instancias Corriendo

```bash
# Ver todas las instancias
bun run status

# Output como JSON
bun run cli status --json
```

**Output**:
```
┌─────────┬───────────────┬───────────────────┬─────────────┬────────┐
│ (index) │     PID       │   Environment     │     Name     │ Status │
├─────────┼───────────────┼───────────────────┼─────────────┼────────┤
│    0    │    12345      │    'production'   │ 'mks-bot...' │'✓ Run' │
│    1    │    12346      │    'staging'      │ 'mks-bot...' │'✓ Run' │
└─────────┴───────────────┴───────────────────┴─────────────┴────────┘
```

---

## Docker Deployment

### Dockerfile Multi-Stage

El template incluye un Dockerfile multi-stage:

```dockerfile
# Build stage
FROM oven/bun:1.3 AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY core/package.json core/
RUN bun install --frozen-lockfile
COPY core/src core/src

# Production stage
FROM oven/bun:1.3 AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/core/node_modules ./core/node_modules
COPY --from=builder /app/core/src ./core/src
RUN mkdir -p /app/core/tmp /app/core/logs
ENV TG_ENV=production
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun run cli status || exit 1
EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  bot-local:
    build: .
    container_name: mks-bot-local
    environment:
      - TG_ENV=local
    env_file:
      - core/.env.local
    volumes:
      - ./core/src:/app/core/src:ro
      - ./core/logs:/app/core/logs
    command: bun run --watch src/index.ts

  bot-staging:
    build: .
    container_name: mks-bot-staging
    environment:
      - TG_ENV=staging
    env_file:
      - core/.env.staging
    ports:
      - "3001:3000"

  bot-production:
    build: .
    container_name: mks-bot-prod
    environment:
      - TG_ENV=production
    env_file:
      - core/.env.production
    ports:
      - "3000:3000"
    restart: unless-stopped
```

### Build y Run

```bash
# Build imagen
docker build -t mks-telegram-bot .

# Run con docker-compose
docker-compose up bot-production

# Ver logs
docker-compose logs -f bot-production

# Ver healthcheck
docker inspect mks-bot-prod | jq '.[0].State.Health'
```

---

## ngrok Integration

### ngrock para Testing Local

El comando `ngrok` tiene soporte multi-entorno:

```bash
# Development con ngrok (local environment)
bun run ngrok --environment local --start-bot

# Staging con ngrok (test bot)
bun run ngrok --environment staging --webhook-url

# Force start aunque haya conflicto
bun run ngrok --environment production --force
```

### Opciones Disponibles

| Opción | Default | Descripción |
| ------ | ------- | ----------- |
| `-p, --port <port>` | `3000` | Puerto a forward |
| `-e, --environment <env>` | `local` | Entorno: local/staging/production |
| `-w, --webhook-url` | `false` | Auto-update webhook URL en .env |
| `-s, --start-bot` | `false` | Auto-start bot después de ngrok |
| `-f, --force` | `false` | Force start aún si hay conflicto |

### Flujo con --environment

1. Carga el archivo `.env.{environment}` correspondiente
2. Detecta conflictos con instancias existentes
3. Inicia ngrok tunnel
4. Opcionalmente actualiza `TG_WEBHOOK_URL` en el .env
5. Opcionalmente inicia el bot con `TG_ENV` configurado

---

## VPS Deployment

### Preparar VPS

1. **Instalar dependencias**:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Clonar repositorio**:
   ```bash
   git clone <repo-url>
   cd mks-telegram-bot
   bun install
   ```

3. **Configurar entorno**:
   ```bash
   cp core/.env.example core/.env.production
   nano core/.env.production
   ```

4. **Crear servicio systemd** (opcional):
   ```ini
   [Unit]
   Description=mks-telegram-bot
   After=network.target

   [Service]
   Type=simple
   User=botuser
   WorkingDirectory=/app/mks-telegram-bot
   Environment="TG_ENV=production"
   ExecStart=/usr/local/bin/bun run start
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

### Deployment con Docker (Recomendado)

```bash
# Build y taggear imagen
docker build -t mks-telegram-bot:latest .
docker tag mks-telegram-bot:latest registry.example.com/mks-bot:latest

# Push a registry (opcional)
docker push registry.example.com/mks-bot:latest

# En VPS
docker pull registry.example.com/mks-bot:latest
docker run -d \
  --name mks-bot-prod \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file core/.env.production \
  registry.example.com/mks-bot:latest
```

---

## Troubleshooting Deployment

### Bot Doesn't Respond

1. Check `TG_BOT_TOKEN` is valid
2. Verify bot is running (`bun run status`)
3. Check `TG_AUTHORIZED_USER_IDS` for control commands

### Webhook Not Working

1. Verify `TG_WEBHOOK_URL` is HTTPS and publicly accessible
2. Check `TG_WEBHOOK_SECRET` matches (min 16 chars)
3. Verify firewall allows incoming connections

### Instance Conflict

**Error**: `INSTANCE_CONFLICT - Another instance is already running`

**Solutions**:
1. Stop the existing instance: `bun run cli kill <instance_name>`
2. Use a different instance name in your `.env` file
3. Disable instance check: `TG_INSTANCE_CHECK=false` (not recommended)
4. Remove stale lock files: `rm -f core/tmp/*.lock core/tmp/*.pid`

### Docker Issues

```bash
# Ver logs del container
docker logs mks-bot-prod

# Entrar al container
docker exec -it mks-bot-prod /bin/sh

# Ver healthcheck
docker inspect mks-bot-prod | jq '.[0].State.Health'
```

### ngrok Tunnel Not Working

1. Verify ngrok is installed: `ngrok version`
2. Check ngrok is not already running on port 4040
3. Use `--force` flag if conflict detected
4. Check port is available: `lsof -i :3000`

---

## Environment Variables Reference

### Variables de Entorno

| Variable | Default | Descripción |
| -------- | ------- | ----------- |
| `TG_ENV` | `local` | Environment: local/staging/production |
| `TG_BOT_TOKEN` | required | Bot token from @BotFather |
| `TG_MODE` | `polling` | `polling` or `webhook` |
| `TG_WEBHOOK_URL` | - | Public HTTPS webhook URL |
| `TG_WEBHOOK_SECRET` | - | Secret token for validation |
| `TG_INSTANCE_NAME` | `mks-bot` | Unique instance name for locking |
| `TG_INSTANCE_CHECK` | `true` | Enable instance conflict detection |
| `LOG_LEVEL` | `info` | Log verbosity |
| `TG_DEBUG` | `false` | Enable debug mode |

---

## Ver También

- [CLAUDE.md](./CLAUDE.md) - Entry point principal
- [CLAUDE.dev.md](./CLAUDE.dev.md) - Desarrollo y patterns
- [README.md](./README.md) - Quick start del proyecto
