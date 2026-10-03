import { Module } from '@nestjs/common';
import { MilestonesController, ProjectsController, TasksController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  controllers: [ProjectsController, TasksController, MilestonesController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
