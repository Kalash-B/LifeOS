import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { ClientIpThrottlerGuard } from './common/client-ip.guard.js';
import { DomainEventsModule } from './common/events/domain-events.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { UserClockModule } from './common/user-clock.service.js';
import { environment } from './config/environment.js';
import { JobsModule } from './jobs/jobs.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { JwtAuthGuard } from './modules/auth/auth.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { FinanceModule } from './modules/finance/finance.module.js';
import { FitnessModule } from './modules/fitness/fitness.module.js';
import { HabitsModule } from './modules/habits/habits.module.js';
import { LearningModule } from './modules/learning/learning.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { RoutineModule } from './modules/routine/routine.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: environment.rateLimitPerMinute }]),
    PrismaModule,
    DomainEventsModule,
    UserClockModule,
    AuthModule,
    UsersModule,
    DashboardModule,
    RoutineModule,
    HabitsModule,
    FitnessModule,
    LearningModule,
    ProjectsModule,
    FinanceModule,
    NotificationsModule,
    AnalyticsModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    // Order matters: rate-limit first, then authenticate (deny by default).
    { provide: APP_GUARD, useClass: ClientIpThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
