import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { environment } from '../config/environment.js';
import { resolveClientIp } from './client-ip.js';

/*
 * In-house rate limiting (replaces @nestjs/throttler, a CommonJS package that
 * require()s the ESM-only NestJS 12 core — Vercel's runtime refuses that).
 * Fixed-window counters per route and per client IP, kept in memory: with
 * several server instances each enforces its own window.
 */

const RATE_LIMIT = 'rateLimit';
const SKIP_RATE_LIMIT = 'skipRateLimit';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

/** Override the default limit for a route or controller. */
export const RateLimit = (limit: number, windowMs = 60_000) => SetMetadata(RATE_LIMIT, { limit, windowMs } satisfies RateLimitOptions);
/** Exempt a route or controller (health checks, cron triggers). */
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT, true);

/** Fixed-window counter store. Exported for unit tests. */
export class RateLimitStore {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  /** Records a hit; returns whether it is allowed and seconds until the window resets. */
  hit(key: string, { limit, windowMs }: RateLimitOptions, now = Date.now()) {
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, window);
      if (this.windows.size > 10_000) this.sweep(now);
    }
    window.count++;
    return { allowed: window.count <= limit, retryAfterSeconds: Math.ceil((window.resetAt - now) / 1000) };
  }

  private sweep(now: number) {
    for (const [key, window] of this.windows) if (window.resetAt <= now) this.windows.delete(key);
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store = new RateLimitStore();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT, targets)) return true;

    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT, targets) ?? {
      limit: environment.rateLimitPerMinute,
      windowMs: 60_000,
    };
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const ip = resolveClientIp(req as unknown as Parameters<typeof resolveClientIp>[0], environment.proxySecret);
    const route = `${context.getClass().name}.${context.getHandler().name}`;

    const { allowed, retryAfterSeconds } = this.store.hit(`${route}:${ip}`, options);
    if (!allowed) {
      http.getResponse<Response>().setHeader('Retry-After', String(retryAfterSeconds));
      throw new HttpException('Too many requests. Please try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
