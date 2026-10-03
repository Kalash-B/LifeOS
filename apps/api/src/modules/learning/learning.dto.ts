import { PartialType } from '@nestjs/swagger';
import { LearningStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_NAME, MAX_TEXT } from '../../common/validation.js';

export class CreateLearningGoalDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) description?: string;
  @IsString() @IsNotEmpty() @MaxLength(50) category: string;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsEnum(LearningStatus) status?: LearningStatus;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
}

export class UpdateLearningGoalDto extends PartialType(CreateLearningGoalDto) {}

export class CreateLearningTopicDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) description?: string;
  @IsOptional() @IsEnum(LearningStatus) status?: LearningStatus;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

export class UpdateLearningTopicDto extends PartialType(CreateLearningTopicDto) {}

export class CreateLearningSessionDto {
  @IsUUID() learningGoalId: string;
  @IsOptional() @IsUUID() learningTopicId?: string;
  @IsDateString() startedAt: string;
  @IsOptional() @IsDateString() endedAt?: string;
  @IsOptional() @IsInt() @Min(1) @Max(24 * 60) durationMinutes?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) productivityRating?: number;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) notes?: string;
}

export class SessionQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(730) days?: number;
  @IsOptional() @IsUUID() goalId?: string;
}
