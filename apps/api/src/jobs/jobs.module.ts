import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../modules/analytics/analytics.module.js';
import { NotificationsModule } from '../modules/notifications/notifications.module.js';
import { NotificationsJob } from './notifications.job.js';
import { RemindersGenerator } from './reminders.generator.js';

@Module({
  imports: [NotificationsModule, AnalyticsModule],
  providers: [RemindersGenerator, NotificationsJob],
  exports: [RemindersGenerator],
})
export class JobsModule {}
