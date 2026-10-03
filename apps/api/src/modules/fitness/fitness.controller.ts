import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import {
  CreateExerciseDto,
  CreateWeightLogDto,
  CreateWorkoutDto,
  ExerciseQueryDto,
  RangeQueryDto,
  UpdateWorkoutDto,
} from './fitness.dto.js';
import { FitnessService } from './fitness.service.js';

@ApiTags('fitness')
@ApiBearerAuth()
@Controller('fitness')
export class FitnessController {
  constructor(private readonly fitness: FitnessService) {}

  @Get('weight')
  weightLogs(@CurrentUser() user: AuthUser, @Query() query: RangeQueryDto) {
    return this.fitness.weightLogs(user.id, query.days);
  }

  @Post('weight')
  createWeightLog(@CurrentUser() user: AuthUser, @Body() dto: CreateWeightLogDto) {
    return this.fitness.createWeightLog(dto, user.id);
  }

  @Delete('weight/:id')
  deleteWeightLog(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.fitness.deleteWeightLog(id, user.id);
  }

  @Get('exercises')
  exercises(@Query() query: ExerciseQueryDto) {
    return this.fitness.exercises(query.q);
  }

  @Post('exercises')
  createExercise(@Body() dto: CreateExerciseDto) {
    return this.fitness.createExercise(dto);
  }

  @Get('workouts')
  workouts(@CurrentUser() user: AuthUser, @Query() query: RangeQueryDto) {
    return this.fitness.workouts(user.id, query.days);
  }

  @Post('workouts')
  createWorkout(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkoutDto) {
    return this.fitness.createWorkout(dto, user.id);
  }

  @Get('workouts/:id')
  workout(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.fitness.workout(id, user.id);
  }

  @Patch('workouts/:id')
  updateWorkout(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkoutDto) {
    return this.fitness.updateWorkout(id, dto, user.id);
  }

  @Delete('workouts/:id')
  deleteWorkout(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.fitness.deleteWorkout(id, user.id);
  }

  @Get('progress')
  progress(@CurrentUser() user: AuthUser) {
    return this.fitness.progress(user.id);
  }
}
