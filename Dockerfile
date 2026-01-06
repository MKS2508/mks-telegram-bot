# Build stage
FROM oven/bun:1.3 AS builder
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY core/package.json core/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY core/tsconfig.json core/
COPY core/src core/src

# Production stage
FROM oven/bun:1.3 AS production
WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/core/node_modules ./core/node_modules

# Copy source and config files
COPY --from=builder /app/core/src ./core/src
COPY --from=builder /app/core/package.json ./core/
COPY --from=builder /app/core/tsconfig.json ./core/

# Create necessary directories
RUN mkdir -p /app/core/tmp /app/core/logs

# Set environment variables
ENV TG_ENV=production
ENV NODE_ENV=production
ENV TG_MODE=webhook

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun run cli status || exit 1

# Expose webhook port
EXPOSE 3000

# Run the bot
CMD ["bun", "run", "start"]
