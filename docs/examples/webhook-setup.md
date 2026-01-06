# Example: Webhook Setup

Ejemplo completo de cómo configurar el bot en modo webhook.

## Paso 1: Configurar Variables de Entorno

**Archivo**: `core/.env.production` (o `.env.staging`)

```bash
# Required para webhook
TG_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TG_MODE=webhook
TG_WEBHOOK_URL=https://mybot.example.com/webhook
TG_WEBHOOK_SECRET=super_secret_token_min_16_chars

# Environment
TG_ENV=production

# Instance
TG_INSTANCE_NAME=my-bot-prod
```

### Generar Webhook Secret

```bash
# Generar secret aleatorio (32 chars)
openssl rand -hex 16

# O usar Node/Bun
bun -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## Paso 2: Configurar Endpoint del Webhook

El endpoint ya está configurado en Telegraf, pero aquí está cómo funciona:

**En `core/src/index.ts`**:

```typescript
import { Bot } from 'telegraf'

const bot = new Bot(process.env.TG_BOT_TOKEN!)

// Webhook configuration
const webhookUrl = process.env.TG_WEBHOOK_URL
const webhookSecret = process.env.TG_WEBHOOK_SECRET

if (process.env.TG_MODE === 'webhook' && webhookUrl) {
  bot.telegram.setWebhook(webhookUrl, {
    secret_token: webhookSecret,
  })
}

// ... rest of bot setup

// Start webhook server
if (process.env.TG_MODE === 'webhook') {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10)
  await bot.startWebhook({
    hookPath: '/webhook',
    port,
    secretToken: webhookSecret,
  })
} else {
  bot.start()
}
```

## Paso 3: Deploy con ngrok (Testing)

### ngrock para Desarrollo Local

```bash
# Iniciar ngrok
bun run ngrok --webhook-url --start-bot
```

Esto:
1. Inicia ngrok tunnel
2. Actualiza `TG_WEBHOOK_URL` en `.env.local`
3. Arranca el bot automáticamente

### Manual ngrok

```bash
# Terminal 1: ngrok
ngrok http 3000

# Copia la URL (ej: https://abc123.ngrok.io)

# Terminal 2: setup
bun run setup --mode webhook --token "YOUR_TOKEN"

# Editar core/.env.local:
# TG_WEBHOOK_URL=https://abc123.ngrok.io/webhook
# TG_WEBHOOK_SECRET=mi_secret_min_16_chars

# Terminal 3: arrancar bot
bun run dev
```

## Paso 4: Deploy a VPS/Cloud

### Opción A: VPS con systemd

**1. Subir código al VPS**:
```bash
git clone <repo>
cd mks-telegram-bot
bun install
```

**2. Configurar entorno**:
```bash
cp core/.env.example core/.env.production
nano core/.env.production
```

**3. Crear servicio systemd**:

```bash
sudo nano /etc/systemd/system/mks-bot.service
```

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
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**4. Habilitar e iniciar**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mks-bot
sudo systemctl start mks-bot
sudo systemctl status mks-bot
```

**5. Ver logs**:
```bash
sudo journalctl -u mks-bot -f
```

### Opción B: Docker

**1. Crear Dockerfile** (ya incluido):

```dockerfile
FROM oven/bun:1.3 AS production
WORKDIR /app
COPY package.json bun.lock ./
COPY core/package.json core/
RUN bun install --frozen-lockfile
COPY core/src core/src
RUN mkdir -p /app/core/tmp /app/core/logs
ENV TG_ENV=production
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "start"]
```

**2. Build y run**:
```bash
docker build -t mks-telegram-bot .
docker run -d \
  --name mks-bot-prod \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file core/.env.production \
  mks-telegram-bot
```

**3. Ver logs**:
```bash
docker logs -f mks-bot-prod
```

### Opción C: Railway

**1. Crear archivo `railway.json`**:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "bun run start",
    "healthcheckPath": "/health"
  }
}
```

**2. Subir a Railway**:
- Connect repo en Railway
- Add variables en el dashboard:
  - `TG_BOT_TOKEN`
  - `TG_MODE=webhook`
  - `TG_WEBHOOK_URL` (Railway lo provee)
  - `TG_WEBHOOK_SECRET`

**3. Deploy automático** al hacer push.

## Paso 5: Configurar Dominio y SSL

### Usar Nginx como Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name mybot.example.com;

    ssl_certificate /etc/letsencrypt/live/mybot.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mybot.example.com/privkey.pem;

    location /webhook {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Obtener Certificado SSL Gratis (Let's Encrypt)

```bash
sudo certbot --nginx -d mybot.example.com
```

## Paso 6: Verificar Webhook

### Chequear Info del Webhook

```bash
curl "https://api.telegram.org/bot<TG_BOT_TOKEN>/getWebhookInfo"
```

Response esperado:
```json
{
  "ok": true,
  "result": {
    "url": "https://mybot.example.com/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "last_error_date": 0,
    "last_error_message": "",
    "max_connections": 40
  }
}
```

### Testear Webhook

Enviar mensaje al bot y verificar logs:

```bash
# Ver logs del bot
tail -f core/logs/info.log

# O en Docker
docker logs -f mks-bot-prod

# O en systemd
journalctl -u mks-bot -f
```

### Borrar Webhook (Volver a Polling)

```bash
curl "https://api.telegram.org/bot<TG_BOT_TOKEN>/deleteWebhook"
```

## Troubleshooting Webhook

### Webhook No Recibe Updates

**1. Verificar URL es accesible**:
```bash
curl https://mybot.example.com/webhook
```

**2. Verificar firewall**:
```bash
# Abrir puertos
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
```

**3. Verificar nginx está corriendo**:
```bash
sudo systemctl status nginx
```

**4. Verificar bot está corriendo**:
```bash
sudo systemctl status mks-bot
```

### Error: Webhook Secret No Coincide

**Verificar secret coincide**:
```bash
grep TG_WEBHOOK_SECRET core/.env.production
```

**Regenerar si es necesario**:
```bash
# Generar nuevo secret
openssl rand -hex 16

# Actualizar .env
nano core/.env.production

# Reiniciar bot
sudo systemctl restart mks-bot
```

### Error: SSL Certificate

**Verificar certificado**:
```bash
curl https://mybot.example.com/webhook -v
```

**Renovar certificado**:
```bash
sudo certbot renew
sudo systemctl reload nginx
```

## Resumen

1. **Configurar variables** en `.env.production`
2. **Deploy** (VPS/Docker/Railway)
3. **Configurar dominio** con SSL
4. **Verificar webhook** con getWebhookInfo
5. **Testear** enviando mensaje al bot

## Próximos Pasos

- [Simple Command Example](./simple-command.md) - Crear comandos
- [Auth Middleware Example](./middleware-auth.md) - Agregar auth
- [Deployment Guide](../CLAUDE.deploy.md) - Deployment completo
