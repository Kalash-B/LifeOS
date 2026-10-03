import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import {
  CreateRoutineDto,
  CreateRoutineItemDto,
  LogRoutineItemDto,
  RoutineDayQueryDto,
  UpdateRoutineDto,
  UpdateRoutineItemDto,
} from './routine.dto.js';
import { RoutineService } from './routine.service.js';

@ApiTags('routine')
@ApiBearerAuth()
@Controller('routines')
export class RoutineController {
  constructor(private readonly routine: RoutineService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.routine.list(user.id);
  }

  @Get('today')
  today(@CurrentUser() user: AuthUser, @Query() query: RoutineDayQueryDto) {
    return this.routine.day(user.id, query.date);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.routine.history(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoutineDto) {
    return this.routine.create(dto, user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.routine.get(id, user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoutineDto) {
    return this.routine.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.routine.remove(id, user.id);
  }

  @Post(':id/items')
  createItem(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRoutineItemDto,
  ) {
    return this.routine.createItem(id, dto, user.id);
  }

  @Patch('items/:itemId')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateRoutineItemDto,
  ) {
    return this.routine.updateItem(itemId, dto, user.id);
  }

  @Delete('items/:itemId')
  removeItem(@CurrentUser() user: AuthUser, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.routine.removeItem(itemId, user.id);
  }

  @Post('items/:itemId/log')
  logItem(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: LogRoutineItemDto,
  ) {
    return this.routine.logItem(itemId, dto, user.id);
  }
}
