import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { map, Observable } from 'rxjs';

export class PaginatedResult<T> {
  constructor(
    public readonly items: T[],
    public readonly meta: { page: number; limit: number; total: number; totalPages: number },
  ) {}
}

export function paginated<T>(items: T[], page: number, limit: number, total: number) {
  return new PaginatedResult(items, {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

/** Prisma Decimals serialize as strings; the API exposes money as numbers. */
export function normalizeDecimals(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Prisma.Decimal.isDecimal(value)) return (value as Prisma.Decimal).toNumber();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(normalizeDecimals);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalizeDecimals(inner);
    }
    return out;
  }
  return value;
}

/** Wraps every successful response in the spec §27 envelope. */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result) => {
        if (result instanceof PaginatedResult) {
          return {
            success: true,
            data: normalizeDecimals(result.items),
            meta: result.meta,
          };
        }
        return { success: true, data: normalizeDecimals(result ?? null) };
      }),
    );
  }
}
