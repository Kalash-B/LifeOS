import { Module } from '@nestjs/common';
import { FitnessController } from './fitness.controller.js';
import { FitnessService } from './fitness.service.js';

@Module({
  controllers: [FitnessController],
  providers: [FitnessService],
  exports: [FitnessService],
})
export class FitnessModule {}
