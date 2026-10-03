import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { environment } from '../config/environment.js';
import { resolveClientIp } from './client-ip.js';

/** Rate limiting keyed on the real visitor IP (see resolveClientIp). */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    return resolveClientIp(req as unknown as Parameters<typeof resolveClientIp>[0], environment.proxySecret);
  }
}
