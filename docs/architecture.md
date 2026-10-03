# LifeOS Architecture

Implements `LifeOS_Master_Specification.md` (see §72 there for decisions made during V1).

## Shape

Modular monolith (spec §5):

```text
Browser ──► Nginx (prod) ──► Next.js web (:3000) ──/api/v1/* rewrite──► NestJS API (:4000)
                                                                          │
                                                   PostgreSQL ◄───────────┤ Prisma
                                                   Redis ◄────────────────┘ BullMQ worker (reminders)
```

The browser only ever talks to the web origin. `next.config.ts` rewrites `/api/v1/*` to the
API, so the refresh-token cookie stays first-party and there is no CORS in normal use.

## Backend (`apps/api`)

```text
src/
├── config/environment.ts        validated env (fails fast in production)
├── common/
│   ├── decorators/              @CurrentUser
│   ├── events/domain-events.ts  in-process event bus (spec §57)
│   ├── filters/                 error envelope (spec §27), no stack traces to clients
│   ├── interceptors/            success envelope, pagination, Decimal → number
│   ├── logging/json-logger.ts   structured logs in production (spec §55)
│   ├── utils/date.util.ts       timezone-aware date keys & ranges (spec §34)
│   ├── user-clock.service.ts    "today" for a user
│   └── validation.ts            IsTimeOfDay / IsDateKey / IsTimeZone
├── jobs/                        BullMQ repeatable job + reminder generator (spec §30)
├── modules/<module>/            controller · service · dto (+ pure calc files with unit tests)
│   auth · users · dashboard · routine · habits · fitness · learning
│   projects · finance · notifications · analytics
└── prisma/                      PrismaService (acts as the repository layer)
```

Request pipeline (spec §6): Throttler guard → global JWT guard (deny by default, `@Public()` to
opt out) → ValidationPipe (whitelist + forbidNonWhitelisted) → controller → service → Prisma.
Every query on user data is scoped by the authenticated user's id; IDs in paths are validated
as UUIDs.

### Cross-module flow

- Modules publish domain events (`HABIT_COMPLETED`, `PROJECT_COMPLETED`, `SAVINGS_MILESTONE`, …).
  `NotificationListeners` turns them into achievement notifications. Handlers run after the
  originating write and can never fail the request.
- `AnalyticsService.series()` computes per-day metrics for any local date range with one
  bounded query per module, bucketed by the user's local date. Daily, weekly, monthly,
  productivity and the LifeOS score are all derived from it (spec §19, §31).
- The dashboard composes module services; it does not duplicate their logic (spec §21).

### Background jobs

`NotificationsJob` registers a BullMQ job scheduler (every 60 s). Each tick:
habit reminders (local reminder time passed, not done today), task due-soon/overdue,
project deadlines, daily review (21:00 local), weekly review (Sunday 18:00), then dispatch of
due `PENDING` notifications. Every generated notification has a `dedupeKey`, so ticks are
idempotent. Quiet hours hold non-critical notifications. Disabled with `JOBS_ENABLED=false`
(the test suites do this).

## Frontend (`apps/web`)

Next.js 16 App Router, client-rendered app pages, TanStack Query for server state, Zustand for
the in-memory access token / toasts / study timer, react-hook-form + zod, Recharts, Tailwind v4
design tokens in `app/globals.css` (light + dark, WCAG AA text contrast).

```text
app/(public)/      landing, login, register
app/(app)/         dashboard, today, routine, tasks, habits, fitness, learning,
                   projects, projects/[id], finance, analytics, notifications, settings
proxy.ts           optimistic redirect for signed-out visitors (Next 16 "proxy" = middleware)
components/ui      Button, Input, Field, Card, Dialog (native <dialog>), Progress, Segmented, …
components/charts  Recharts wrappers + ChartFrame (every chart has a table view)
lib/api.ts         fetch wrapper: envelope parsing, single-flight token refresh
```

## Installable app

`app/manifest.ts` (display `fullscreen`), icons in `public/icons`, `public/sw.js` (app shell +
offline page, never API data; registered in production only), `lib/pwa.ts` (install prompt,
full-screen toggle). Install from Settings → LifeOS app, the header button, or the browser.

## Auth sessions

Access token (15 min, memory only) + refresh token (30 days, httpOnly cookie scoped to
`/api/v1/auth`, SHA-256 hashed in the `Session` table, rotated on every refresh, replay of a
rotated token revokes all of the user's sessions). A non-secret `lifeos_session` cookie lets
`proxy.ts` redirect signed-out visitors before rendering. On a hard reload `AuthGate`
exchanges the cookie for a new access token; only a 401 signs the user out — rate limits and
network errors show a retry.
