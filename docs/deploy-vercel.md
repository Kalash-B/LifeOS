# Deploying LifeOS on Vercel

Two Vercel projects from the same repo, plus Neon Postgres from the Vercel Marketplace.
No Redis is needed on Vercel (the reminder worker is replaced by Vercel Cron).

```text
Browser ─► lifeos (apps/web, Next.js) ──/api/v1/* rewrite──► lifeos-api (apps/api, Vercel Function) ─► Neon Postgres
                                                                   ▲
                                                     Vercel Cron ──┘  GET /api/v1/jobs/reminders
```

## How the API runs on Vercel

- Vercel's automatic NestJS build transpiles with esbuild, which drops the decorator metadata
  NestJS needs for dependency injection. So `apps/api/vercel.json` disables framework detection,
  `npm run vercel-build` compiles with `nest build` (real tsc), and `apps/api/api/index.js` — a
  plain-JS entry — forwards every request to `dist/serverless.js`.
- `npm run vercel-build` also applies Prisma migrations (via `DATABASE_URL_UNPOOLED`) and seeds the
  shared exercise library (idempotent).
- Reminders: Vercel Cron calls `/api/v1/jobs/reminders` with `Authorization: Bearer $CRON_SECRET`.
  **Hobby plans allow one run per day** (fires within the hour) — the default schedule
  `0 16 * * *` (16:00 UTC ≈ 21:30 IST) delivers daily reviews, overdue/due-soon task alerts,
  project deadlines and any habit reminders not yet done. On **Pro**, change the schedule in
  `apps/api/vercel.json` to `*/5 * * * *` for timely habit reminders.
- Rate limiting: Vercel replaces `X-Forwarded-For`, so the API would only see the web server's IP.
  The web app's `proxy.ts` forwards the visitor's IP with `PROXY_SECRET`; set the **same** value on
  both projects.

## 1. Backend project (`lifeos-api`)

1. vercel.com → **Add New → Project** → import `Kalash-B/LifeOS`.
2. **Root Directory:** `apps/api`. Leave framework/build settings alone — `apps/api/vercel.json`
   defines them.
3. **Storage → Marketplace → Neon → Create** (choose a region near your users, e.g. Singapore) and
   connect it to this project. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
4. **Settings → Functions → Region:** the same region as the database.
5. **Settings → Environment Variables** (Production + Preview):

   | Name | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | `openssl rand -base64 48` |
   | `CRON_SECRET` | `openssl rand -base64 32` |
   | `PROXY_SECRET` | `openssl rand -base64 32` (copy it — the web project needs the same value) |
   | `JOBS_ENABLED` | `false` |
   | `APP_URL` | `https://<web-project>.vercel.app` (set after step 2; comma-separate extra domains) |

6. **Deploy.** Check `https://<api-project>.vercel.app/api/v1/health` → `"status":"ok"`.

## 2. Frontend project (`lifeos`)

1. **Add New → Project** → import the same repo.
2. **Root Directory:** `apps/web` (Next.js is detected).
3. **Environment Variables:**

   | Name | Value |
   |---|---|
   | `API_URL` | `https://<api-project>.vercel.app` (read at build time — redeploy after changing) |
   | `PROXY_SECRET` | the same value as the API project |

4. **Settings → Functions → Region:** same region as the API.
5. **Deploy**, then set `APP_URL` on the API project to this URL and redeploy the API.

## 3. Verify

1. Open the web URL, register, reload — you stay signed in.
2. API project → **Settings → Cron Jobs** → **Run** on `/api/v1/jobs/reminders` and check the logs
   for `{"ok":true,...}`.
3. Install the app from Chrome (HTTPS makes the PWA installable).

Every push to `main` redeploys both projects; pending migrations run during the API build.
Preview deployments get their own Neon branch automatically.

The Docker / Render path (`docker compose --profile app`) still works unchanged.
