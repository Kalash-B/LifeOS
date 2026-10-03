# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
# API_URL is read by next.config rewrites at build time and baked into the routes manifest.
ARG API_URL=http://api:4000
ENV API_URL=$API_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S lifeos && adduser -S lifeos -G lifeos
COPY --from=build --chown=lifeos:lifeos /app/.next/standalone ./
COPY --from=build --chown=lifeos:lifeos /app/.next/static ./.next/static
# Standalone output excludes public/ (icons, logo, service worker) — copy it explicitly.
COPY --from=build --chown=lifeos:lifeos /app/public ./public
USER lifeos
EXPOSE 3000
CMD ["node", "server.js"]
