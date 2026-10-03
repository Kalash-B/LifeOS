# LifeOS Security

Follows spec §9, §28, §36, §44. Verified by `apps/api/test/security.e2e-spec.ts`.

- **Passwords** — bcrypt (12 rounds); login is constant-time for unknown emails and returns one
  generic error. Changing the password revokes all sessions.
- **Sessions** — "Keep me logged in" (default on) gives a 30-day persistent refresh cookie; off gives a
  browser-session cookie with a 12-hour server limit. 15-minute JWT (HS256, memory only in the browser) + rotating refresh token in
  an httpOnly, SameSite=Lax cookie scoped to `/api/v1/auth` (Secure in production). Refresh
  tokens are stored only as SHA-256 hashes; replaying a rotated token revokes every session.
- **Authorization** — a global guard denies by default; ownership is checked server-side on
  every read/write by scoping queries to the token's user id. Client-supplied user ids are
  rejected (`forbidNonWhitelisted`). Cross-user access returns 404.
- **Validation** — class-validator DTOs on every endpoint (lengths, enums, ranges, money with ≤ 2
  decimals, UUID path params, IANA timezones) plus DB constraints (FKs, uniques, CHECKs).
- **Rate limiting** — per IP; strict on credential endpoints. Behind a proxy the API trusts one
  hop of `X-Forwarded-For` — Nginx sets it in `docker/nginx/default.conf`. Without an edge proxy
  (local dev) all browsers share the web server's IP.
- **Headers** — Helmet on the API; `nosniff`, `DENY` framing, referrer and permissions policies on
  the web app; HSTS at Nginx.
- **Errors & logs** — clients never see stack traces or DB errors; production logs are
  structured JSON without passwords, tokens or amounts.
- **Secrets** — environment only; `JWT_SECRET` is required (≥ 32 chars) in production and the API
  refuses to start without it. `.env*` files are git-ignored.
- **Privacy** — no bank credentials are ever collected; users can export all data
  (`GET /users/me/export`) and delete their account (password-confirmed, cascades everything).
- **Redirects** — the `?next=` parameter after login only accepts same-origin relative paths.

Known gaps before public launch: push/email delivery (needs VAPID/SMTP), Sentry wiring, admin
console with audit log (spec §8.3), CSP header, automated backup job.
