# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ─── Stage 2: Production image ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Non-root user for security
RUN addgroup -S payflow && adduser -S payflow -G payflow

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN chown -R payflow:payflow /app
USER payflow

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
