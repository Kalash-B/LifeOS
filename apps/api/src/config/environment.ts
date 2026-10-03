import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

function required(name: string, fallbackForDev?: string): string {
  const value = process.env[name];
  if (value && value.trim()) return value;
  if (!isProduction && fallbackForDev !== undefined) return fallbackForDev;
  throw new Error(`Missing required environment variable: ${name}`);
}

const jwtSecret = required('JWT_SECRET', 'lifeos-dev-only-secret-change-me-0000000000');
if (isProduction && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

export const environment = {
  isProduction,
  isTest,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret,
  /** Short-lived access token; the refresh token lives in an httpOnly cookie. */
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 15 * 60),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  /** Max lifetime of a session when "Keep me logged in" is off (cookie also ends with the browser). */
  shortSessionTtlHours: Number(process.env.SHORT_SESSION_TTL_HOURS ?? 12),
  appUrls: (process.env.APP_URL ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  /**
   * Proxy hops in front of the API that append X-Forwarded-For (Nginx = 1).
   * Rate limits key on the client IP, so this must match the deployment.
   */
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 1),
  /** Shared with the web app; lets it forward the visitor's real IP for rate limiting. */
  proxySecret: process.env.PROXY_SECRET ?? '',
  /** Shared secret Vercel Cron sends as `Authorization: Bearer <CRON_SECRET>`. */
  cronSecret: process.env.CRON_SECRET ?? '',
  /** Background jobs (reminders, dispatch) — disabled in tests. */
  jobsEnabled: (process.env.JOBS_ENABLED ?? (isTest ? 'false' : 'true')) === 'true',
  /** Global rate limit per IP per minute; auth routes are stricter. */
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 300),
  authRateLimitPerMinute: Number(process.env.AUTH_RATE_LIMIT_PER_MINUTE ?? (isTest ? 1000 : 10)),
} as const;
