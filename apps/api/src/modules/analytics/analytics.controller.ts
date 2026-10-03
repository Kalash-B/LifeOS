import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { IsDateKey } from '../../common/validation.js';
import { AnalyticsService } from './analytics.service.js';

class DateQueryDto {
  @IsOptional() @IsDateKey() date?: string;
}

class MonthQueryDto {
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be YYYY-MM' }) month?: string;
}

class DaysQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(7) @Max(90) days?: number;
}

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('daily')
  daily(@CurrentUser() user: AuthUser, @Query() query: DateQueryDto) {
    return this.analytics.daily(user.id, query.date);
  }

  @Get('weekly')
  weekly(@CurrentUser() user: AuthUser) {
    return this.analytics.weekly(user.id);
  }

  @Get('monthly')
  monthly(@CurrentUser() user: AuthUser, @Query() query: MonthQueryDto) {
    return this.analytics.monthly(user.id, query.month);
  }

  @Get('productivity')
  productivity(@CurrentUser() user: AuthUser, @Query() query: DaysQueryDto) {
    return this.analytics.productivity(user.id, query.days);
  }

  @Get('score')
  score(@CurrentUser() user: AuthUser, @Query() query: DateQueryDto) {
    return this.analytics.score(user.id, query.date);
  }

  @Get('fitness')
  fitness(@CurrentUser() user: AuthUser) {
    return this.analytics.fitnessAnalytics(user.id);
  }

  @Get('learning')
  learning(@CurrentUser() user: AuthUser) {
    return this.analytics.learningAnalytics(user.id);
  }

  @Get('projects')
  projects(@CurrentUser() user: AuthUser) {
    return this.analytics.projectsAnalytics(user.id);
  }

  @Get('finance')
  finance(@CurrentUser() user: AuthUser) {
    return this.analytics.financeAnalytics(user.id);
  }
}
