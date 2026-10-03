import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module.js';
import { FitnessModule } from '../fitness/fitness.module.js';
import { LearningModule } from '../learning/learning.module.js';
import { UsersModule } from '../users/users.module.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  imports: [UsersModule, FitnessModule, LearningModule, FinanceModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
