import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import {
  CreateMilestoneDto,
  CreateProjectDto,
  CreateTaskDto,
  TaskQueryDto,
  UpdateMilestoneDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from './projects.dto.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.projects.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projects.create(dto, user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.projects.get(id, user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.projects.remove(id, user.id);
  }

  @Get(':id/tasks')
  tasks(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.projects.projectTasks(id, user.id);
  }

  @Post(':id/tasks')
  createTask(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTaskDto) {
    return this.projects.createTask(id, dto, user.id);
  }

  @Post(':id/milestones')
  createMilestone(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateMilestoneDto) {
    return this.projects.createMilestone(id, dto, user.id);
  }
}

@ApiTags('projects')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: TaskQueryDto) {
    return this.projects.tasks(user.id, query);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.projects.updateTask(id, dto, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.projects.removeTask(id, user.id);
  }
}

@ApiTags('projects')
@ApiBearerAuth()
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly projects: ProjectsService) {}

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMilestoneDto) {
    return this.projects.updateMilestone(id, dto, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.projects.removeMilestone(id, user.id);
  }
}
