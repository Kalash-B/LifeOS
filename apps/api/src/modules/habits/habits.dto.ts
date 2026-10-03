import { PartialType } from '@nestjs/swagger';
import { HabitFrequency, HabitLogStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsDateKey, IsTimeOfDay, MAX_NAME, MAX_TEXT } from '../../common/validation.js';

export class CreateHabitDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) description?: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(HabitFrequency)
  frequencyType: HabitFrequency;
  @IsOptional() @IsNumber() @IsPositive() @Max(100000) targetValue?: number;
  @IsOptional() @IsString() @MaxLength(30) unit?: string;
  @IsOptional() @IsTimeOfDay() reminderTime?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateHabitDto extends PartialType(CreateHabitDto) {}

export class LogHabitDto {
  @IsDateKey() date: string;
  @IsOptional() @IsEnum(HabitLogStatus) status?: HabitLogStatus;
  @IsOptional() @IsNumber() @Min(0) @Max(100000) value?: number;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) notes?: string;
}

export class HabitListQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeArchived?: boolean;
}
