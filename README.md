# LifeOS — Personal Life Operating System

One system for your day, habits, fitness, learning, projects and money — with reminders and
analytics built from your own records. **Plan → Execute → Track → Analyze → Reflect → Improve.**

The product and technical source of truth is [`LifeOS_Master_Specification.md`](LifeOS_Master_Specification.md).

| | |
|---|---|
| `apps/web` | Next.js 16 · React 19 · Tailwind v4 · TanStack Query · react-hook-form + zod · Recharts |
| `apps/api` | NestJS 12 · Prisma 5 · PostgreSQL · Redis/BullMQ |
| `docs/` | [architecture](docs/architecture.md) · [API](docs/api.md) · [database](docs/database.md) · [security](docs/security.md) |

## Run locally

Requires Node 24 and Docker.

```bash
cp .env.example .env                       # then set JWT_SECRET (openssl rand -base64 48)
cp .env.example apps/api/.env              # the API reads its own .env
docker compose up -d postgres redis        # Postgres on :55432, Redis on :6379

cd apps/api
npm install
npm run db:migrate && npm run db:seed      # schema + shared exercise library
npm run start:dev                          # http://localhost:4000  (docs at /api/docs)

cd ../web
npm install
npm run dev                                # http://localhost:3000
```

The web app proxies `/api/v1/*` to `API_URL` (default `http://localhost:4000`).

## Deploy

- **Vercel** (web + API + Neon Postgres): [docs/deploy-vercel.md](docs/deploy-vercel.md)
- **Docker** (any VM / Render): below.

## Run the full stack in Docker

```bash
docker compose --profile app up -d --build     # http://localhost:8080 (Nginx → web → api)
```

The API container applies migrations and seeds the exercise library on start.

## Tests

```bash
cd apps/api
npm test              # unit: streaks, score, finance, recurrence, timezones
npm run test:e2e      # API → service → database, incl. cross-user security suite (needs Postgres)

cd apps/web
npm run test:e2e      # Playwright, desktop + mobile (needs the stack running on :3000,
                      # or E2E_BASE_URL=http://localhost:8080 for the Docker stack)
```

CI (`.github/workflows/ci.yml`) runs lint, type-checks, unit + API e2e, builds, and Playwright
against the Docker stack.

## What's in V1

Authentication with rotating sessions · profile, timezone & settings · dashboard with a
transparent, re-weightable LifeOS score · today view · routines with recurrence · habits with
schedule-aware streaks · weight, workouts, sets, PRs · learning goals, topics, timer & sessions ·
projects, tasks board, milestones, auto progress · accounts, income, expenses, savings goals,
investments, monthly reports · in-app notifications with reminders, quiet hours, daily/weekly
reviews and achievements · daily/weekly/monthly/project analytics · JSON export & account
deletion · light/dark themes · responsive mobile layout with quick add.

**Install as an app:** open LifeOS in Chrome/Edge (desktop or Android) and use *Install app* in the
header or Settings → LifeOS app; on iPhone use Share → Add to Home Screen. It then opens full
screen with the LifeOS icon. (The service worker only registers in production builds —
`npm run build && npm start`, or the Docker stack.)

Planned next (spec §4): push/email delivery, PWA/offline, calendar integration, admin console,
AI assistant.
