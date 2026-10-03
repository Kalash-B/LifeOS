import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { FinanceModule } from '../finance/finance.module.js';
import { HabitsModule } from '../habits/habits.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { RoutineModule } from '../routine/routine.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [RoutineModule, HabitsModule, ProjectsModule, AnalyticsModule, FinanceModule, NotificationsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
