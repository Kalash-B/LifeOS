import { Global, Injectable, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { localDateKey } from './utils/date.util.js';

/** Resolves a user's timezone and "today" so daily calculations respect it (spec §34). */
@Injectable()
export class UserClock {
  constructor(private readonly prisma: PrismaService) {}

  async timezone(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    return user?.timezone ?? 'UTC';
  }

  async today(userId: string, now = new Date()): Promise<{ timezone: string; today: string }> {
    const timezone = await this.timezone(userId);
    return { timezone, today: localDateKey(now, timezone) };
  }
}

@Global()
@Module({ providers: [UserClock], exports: [UserClock] })
export class UserClockModule {}
