import { Module } from '@nestjs/common';
import { HabitsModule } from '../habits/habits.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationListeners } from './notifications.listeners.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  imports: [HabitsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationListeners],
  exports: [NotificationsService],
})
export class NotificationsModule {}
