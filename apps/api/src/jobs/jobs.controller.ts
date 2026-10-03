import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { environment } from '../config/environment.js';
import { Public } from '../modules/auth/auth.guard.js';
import { RemindersGenerator } from './reminders.generator.js';

/**
 * Scheduled-job trigger for serverless hosting (Vercel Cron), replacing the
 * always-on BullMQ worker. The generator is idempotent, so duplicate or missed
 * cron deliveries are harmless.
 */
@ApiExcludeController()
@Controller('jobs')
export class JobsController {
  constructor(private readonly reminders: RemindersGenerator) {}

  @Public()
  @SkipThrottle()
  @Get('reminders')
  async runReminders(@Headers('authorization') authorization?: string) {
    const expected = environment.cronSecret ? `Bearer ${environment.cronSecret}` : '';
    const given = authorization ?? '';
    const valid =
      expected.length > 0 &&
      given.length === expected.length &&
      timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    if (!valid) throw new UnauthorizedException('Invalid cron secret.');

    const delivered = await this.reminders.run();
    return { ok: true, delivered, ranAt: new Date().toISOString() };
  }
}
