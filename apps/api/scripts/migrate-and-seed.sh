#!/bin/sh
# Runs during the Vercel build. Migrations must use a direct (unpooled)
# connection; Neon's Vercel integration provides DATABASE_URL_UNPOOLED for that.
# Without it, Prisma falls back to DATABASE_URL (env or .env).
set -e
if [ -n "$DATABASE_URL_UNPOOLED" ]; then
  export DATABASE_URL="$DATABASE_URL_UNPOOLED"
fi
npx prisma migrate deploy
node prisma/seed.mjs   # idempotent: shared exercise library
