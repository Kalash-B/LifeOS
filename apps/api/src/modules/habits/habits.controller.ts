import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { CreateHabitDto, HabitListQueryDto, LogHabitDto, UpdateHabitDto } from './habits.dto.js';
import { HabitsService } from './habits.service.js';

@ApiTags('habits')
@ApiBearerAuth()
@Controller('habits')
export class HabitsController {
  constructor(private readonly habits: HabitsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: HabitListQueryDto) {
    return this.habits.list(user.id, query.includeArchived);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHabitDto) {
    return this.habits.create(dto, user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.habits.get(id, user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHabitDto) {
    return this.habits.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.habits.remove(id, user.id);
  }

  @Post(':id/log')
  log(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: LogHabitDto) {
    return this.habits.log(id, dto, user.id);
  }

  @Get(':id/stats')
  stats(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.habits.stats(id, user.id);
  }
}
