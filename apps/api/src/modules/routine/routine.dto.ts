import { PartialType } from '@nestjs/swagger';
import { RoutineLogStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsDateKey, IsTimeOfDay, MAX_NAME, MAX_TEXT } from '../../common/validation.js';
import { RECURRENCE_PATTERN } from './routine.recurrence.js';

export class CreateRoutineDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateRoutineDto extends PartialType(CreateRoutineDto) {}

export class CreateRoutineItemDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) title: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) description?: string;
  @IsOptional() @IsString() @MaxLength(50) category?: string;
  @IsOptional() @IsTimeOfDay() startTime?: string;
  @IsOptional() @IsTimeOfDay() endTime?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) priority?: number;
  @IsOptional() @Matches(RECURRENCE_PATTERN, { message: 'recurrenceRule must be DAILY, WEEKDAYS, WEEKENDS or WEEKLY:MO,WE,...' })
  recurrenceRule?: string;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

export class UpdateRoutineItemDto extends PartialType(CreateRoutineItemDto) {}

export class LogRoutineItemDto {
  @IsDateKey() date: string;
  @IsEnum(RoutineLogStatus) status: RoutineLogStatus;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) notes?: string;
}

export class RoutineDayQueryDto {
  @IsOptional() @IsDateKey() date?: string;
}
