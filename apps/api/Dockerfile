# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
# Prisma's query/schema engines need OpenSSL, which Alpine doesn't ship by default.
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:24-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S lifeos && adduser -S lifeos -G lifeos
COPY --from=build --chown=lifeos:lifeos /app/node_modules ./node_modules
COPY --from=build --chown=lifeos:lifeos /app/dist ./dist
COPY --from=build --chown=lifeos:lifeos /app/prisma ./prisma
COPY --from=build --chown=lifeos:lifeos /app/package.json ./package.json
USER lifeos
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1
# Apply pending migrations, seed the shared exercise library (idempotent), then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.mjs && node dist/main.js"]
