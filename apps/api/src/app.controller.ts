import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipRateLimit } from './common/rate-limit.js';
import { Public } from './modules/auth/auth.guard.js';
import { PrismaService } from './prisma/prisma.service.js';

@ApiTags('health')
@Controller('health')
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipRateLimit()
  @Get()
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unavailable.');
    }
    return { status: 'ok', service: 'lifeos-api', time: new Date().toISOString() };
  }
}
