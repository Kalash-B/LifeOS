import { timingSafeEqual } from 'node:crypto';

export const CLIENT_IP_HEADER = 'x-lifeos-client-ip';
export const PROXY_SECRET_HEADER = 'x-lifeos-proxy-secret';

type HeaderValue = string | string[] | undefined;

interface RequestLike {
  ip?: string;
  headers: Record<string, HeaderValue>;
}

const first = (value: HeaderValue) => (Array.isArray(value) ? value[0] : value);

function sameSecret(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The visitor's IP for rate limiting. When the web app proxies a request (e.g.
 * two Vercel projects, where the API only ever sees the web server's IP), it
 * forwards the real client IP plus a shared secret. Without a matching secret
 * the header is ignored, so clients cannot spoof their way around limits.
 */
export function resolveClientIp(req: RequestLike, proxySecret: string): string {
  const forwarded = first(req.headers[CLIENT_IP_HEADER])?.trim();
  const secret = first(req.headers[PROXY_SECRET_HEADER]);
  if (proxySecret && forwarded && secret && sameSecret(secret, proxySecret) && forwarded.length <= 64) {
    return forwarded;
  }
  return req.ip ?? 'unknown';
}
