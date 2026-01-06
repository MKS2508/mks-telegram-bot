# Troubleshooting

Guía de solución de problemas comunes del bot.

## Bot No Responde

### Síntomas

- El bot no responde a ningún comando
- Telegram muestra "bot is not running"
- Timeouts en `/health`

### Causas Comunes

#### 1. Token Inválido o Incorrecto

**Verificar**:
```bash
grep TG_BOT_TOKEN core/.env.local
```

**Solución**:
1. Ve a @BotFather
2. `/mybots` → selecciona tu bot → `API Token`
3. Copia el token correcto
4. Actualiza `core/.env.local`

```bash
# Editar el archivo
nano core/.env.local

# O usar setup
bun run setup --token "CORRECT_TOKEN"
```

#### 2. Modo Incorrecto

**Verificar**:
```bash
grep TG_MODE core/.env.local
```

**Solución**:

Para desarrollo:
```bash
TG_MODE=polling
```

Para producción con webhook:
```bash
TG_MODE=webhook
TG_WEBHOOK_URL=https://your-domain.com/webhook
TG_WEBHOOK_SECRET=secret_min_16_chars
```

#### 3. Bot No Iniciado

**Verificar**:
```bash
bun run cli status
```

**Solución**:
```bash
bun run dev
```

#### 4. Puerto en Uso

**Error**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Verificar**:
```bash
lsof -i :3000
```

**Solución**:
```bash
# Matar el proceso
kill -9 $(lsof -t -i:3000)

# O cambiar puerto en .env
# (necesita implementación adicional)
```

### Diagnóstico Completo

```bash
bun run doctor
```

## Webhook No Funciona

### Síntomas

- Webhook configurado pero no llegan updates
- Error "webhook not set"
- 404 en endpoint del webhook

### Causas Comunes

#### 1. URL No Pública

**Error**: Webhook URL no es accesible públicamente

**Verificar**:
```bash
curl https://your-domain.com/webhook
```

**Solución**:
- Usa ngrok para desarrollo: `bun run ngrok`
- O deploy a VPS/Cloud con dominio público

#### 2. URL No es HTTPS

**Error**:
```
Error: webhook URL must be HTTPS
```

**Solución**:
- Telegram requiere HTTPS obligatoriamente
- Usa certificados SSL (Let's Encrypt gratis)

#### 3. Webhook Secret No Coincide

**Error**: Validación de webhook falla

**Verificar**:
```bash
grep TG_WEBHOOK_SECRET core/.env.production
```

**Solución**:
- Asegúrate que el secret coincide en bot y servidor
- Mínimo 16 caracteres

```bash
TG_WEBHOOK_SECRET=super_secret_token_min_16_chars
```

#### 4. Firewall Bloquea

**Síntoma**: curl local funciona pero Telegram no

**Verificar**:
```bash
# Desde otro servidor
curl https://your-domain.com/webhook
```

**Solución**:
```bash
# Abrir puerto (ufw)
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

# O en iptables
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

### ngrok Troubleshooting

#### ngrok No Inicia

**Error**:
```
Error: ngrok is not installed
```

**Solución**:
```bash
# Instalar ngrok
brew install ngrok  # macOS
# O desde https://ngrok.com

# Autenticar
ngrok config add-authtoken YOUR_TOKEN
```

#### ngrok Tunnel Falla

**Error**: `ERR_NGROK_6024`

**Solución**:
1. Verifica que ngrok está autenticado
2. Verifica que puerto 4040 está libre
3. Usa otro puerto: `bun run ngrok --port 3001`

## Instance Conflict

### Síntomas

**Error**:
```
INSTANCE_CONFLICT - Another instance is already running
```

### Causas

Otra instancia del bot está corriendo con el mismo nombre.

### Soluciones

#### 1. Ver Instancias

```bash
bun run cli status
```

#### 2. Parar Instancia Existente

```bash
# Matar el proceso
kill -9 <PID>

# O usar el comando kill
bun run cli kill <instance_name>
```

#### 3. Remover Lock Files Stale

```bash
rm -f core/tmp/*.lock core/tmp/*.pid
```

#### 4. Usar Nombre Diferente

En `core/.env.local`:
```bash
TG_INSTANCE_NAME=my-bot-2
```

#### 5. Deshabilitar Check (No Recomendado)

```bash
TG_INSTANCE_CHECK=false
```

## Error de Dependencias

### Module Not Found

**Error**:
```
Error: Cannot find module '@mks2508/telegram-bot-utils'
```

**Solución**:
```bash
bun install
```

### Workspace Issues

**Error**:
```
Error: Workspace package not found
```

**Solución**:
```bash
# Limpiar y reinstalar
bun run clean
bun install
```

## TypeCheck Errors

### Error: Cannot Find Module

**Error**:
```
TS2307: Cannot find module './handlers/mycommand.js'
```

**Causa**: Extension `.js` en imports ES modules

**Solución**: Asegúrate de usar `.js` en imports:
```typescript
// ✅ Correcto
import { handleMyCommand } from './handlers/mycommand.js'

// ❌ Incorrecto
import { handleMyCommand } from './handlers/mycommand'
```

### Type Errors con Telegraf

**Error**:
```
TS2345: Argument of type 'Context' is not assignable to...
```

**Solución**: Usa type assertions o proper typing:
```typescript
import type { Context } from 'telegraf'

export async function handleMyCommand(ctx: Context): Promise<void> {
  // ...
}
```

## Environment Variables Issues

### Variables No Cargadas

**Síntoma**: Variables undefined en runtime

**Verificar**:
```bash
# Archivo existe
ls -la core/.env.local

# Contenido
cat core/.env.local
```

**Solución**:
1. Verifica formato: `KEY=value` (sin espacios alrededor de `=`)
2. Verifica que el archivo se llama `.env.local` (no `.env.local.txt`)
3. Revisa comillas: no usar comillas alrededor de valores

```bash
# ✅ Correcto
TG_BOT_TOKEN=123:ABC

# ❌ Incorrecto
TG_BOT_TOKEN = 123:ABC
TG_BOT_TOKEN="123:ABC"
```

### TG_ENV No Funciona

**Síntoma**: Siempre carga `.env.local`

**Verificar**:
```bash
echo $TG_ENV
```

**Solución**:
```bash
# Setear explícitamente
TG_ENV=staging bun run start

# O exportar
export TG_ENV=staging
bun run start
```

## Permission Issues

### core/tmp No Writable

**Error**:
```
Error: EACCES: permission denied, mkdir 'core/tmp'
```

**Solución**:
```bash
# Crear directorio
mkdir -p core/tmp

# Dar permisos
chmod 755 core/tmp

# Verificar
ls -la core/
```

### Logs Directory Issues

**Error**:
```
Error: EACCES: permission denied, open 'core/logs/info.log'
```

**Solución**:
```bash
mkdir -p core/logs
chmod 755 core/logs
```

## Performance Issues

### Bot Lento

**Causas**:
1. Operaciones async bloqueantes
2. No usar async/await correctamente
3. Demasiados logs en producción

**Soluciones**:

1. Usar timeouts en operaciones externas:
```typescript
const controller = new AbortController()
setTimeout(() => controller.abort(), 5000)

await fetch(url, { signal: controller.signal })
```

2. Reducir log level en producción:
```bash
LOG_LEVEL=warn
```

3. Usar rate limiting:
```bash
TG_RATE_LIMIT=30
```

### Memoria Alta

**Verificar**:
```bash
bun run dev
# En otra terminal:
ps aux | grep "bun.*index.ts"
```

**Soluciones**:
1. Limitar buffer de logs
2. Usar file logging en lugar de streaming
3. Revisar memory leaks en código custom

## Getting Help

### Diagnosticar Antes de Pedir Ayuda

1. **Ejecutar doctor**:
```bash
bun run doctor
```

2. **Ver logs completos**:
```bash
tail -50 core/logs/error.log
```

3. **Ver variables de entorno**:
```bash
cat core/.env.local
```

4. **Ver instancias**:
```bash
bun run cli status
```

### Información a Incluir

Al pedir ayuda, incluye:

1. **Versión de Bun**:
```bash
bun --version
```

2. **Output de doctor**:
```bash
bun run doctor
```

3. **Error completo** (stack trace)

4. **Sistema operativo**:
```bash
uname -a
```

### Recursos

- **Troubleshooting Telegram**: [Bot FAQ](https://core.telegram.org/bots/faq)
- **Telegraf Issues**: [GitHub Issues](https://github.com/telegraf/telegraf/issues)
- **Template Issues**: Crea issue en el repo

## Referencias

- [Getting Started](./getting-started.md) - Primeros pasos
- [CLI Commands](./cli-commands.md) - Comandos útiles
- [Development](./development.md) - Debugging
