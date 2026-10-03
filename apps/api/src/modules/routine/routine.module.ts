import { Module } from '@nestjs/common';
import { RoutineController } from './routine.controller.js';
import { RoutineService } from './routine.service.js';

@Module({
  controllers: [RoutineController],
  providers: [RoutineService],
  exports: [RoutineService],
})
export class RoutineModule {}
