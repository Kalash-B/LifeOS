import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import {
  CreateLearningGoalDto,
  CreateLearningSessionDto,
  CreateLearningTopicDto,
  SessionQueryDto,
  UpdateLearningGoalDto,
  UpdateLearningTopicDto,
} from './learning.dto.js';
import { LearningService } from './learning.service.js';

@ApiTags('learning')
@ApiBearerAuth()
@Controller('learning')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('goals')
  goals(@CurrentUser() user: AuthUser) {
    return this.learning.goals(user.id);
  }

  @Post('goals')
  createGoal(@CurrentUser() user: AuthUser, @Body() dto: CreateLearningGoalDto) {
    return this.learning.createGoal(dto, user.id);
  }

  @Get('goals/:id')
  goal(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.learning.goal(id, user.id);
  }

  @Patch('goals/:id')
  updateGoal(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLearningGoalDto) {
    return this.learning.updateGoal(id, dto, user.id);
  }

  @Delete('goals/:id')
  deleteGoal(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.learning.deleteGoal(id, user.id);
  }

  @Post('goals/:id/topics')
  createTopic(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateLearningTopicDto) {
    return this.learning.createTopic(id, dto, user.id);
  }

  @Patch('topics/:id')
  updateTopic(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLearningTopicDto) {
    return this.learning.updateTopic(id, dto, user.id);
  }

  @Delete('topics/:id')
  deleteTopic(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.learning.deleteTopic(id, user.id);
  }

  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser, @Query() query: SessionQueryDto) {
    return this.learning.sessions(user.id, query.days, query.goalId);
  }

  @Post('sessions')
  createSession(@CurrentUser() user: AuthUser, @Body() dto: CreateLearningSessionDto) {
    return this.learning.createSession(dto, user.id);
  }

  @Delete('sessions/:id')
  deleteSession(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.learning.deleteSession(id, user.id);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.learning.stats(user.id);
  }
}
