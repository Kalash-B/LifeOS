import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_NAME, MAX_TEXT } from '../../common/validation.js';

export class CreateWeightLogDto {
  @IsNumber() @IsPositive() @Max(1000) weight: number;
  @IsOptional() @IsIn(['kg', 'lb']) unit?: string;
  @IsOptional() @IsDateString() recordedAt?: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) notes?: string;
}

export class CreateExerciseDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name: string;
  @IsOptional() @IsString() @MaxLength(50) muscleGroup?: string;
  @IsOptional() @IsString() @MaxLength(50) equipment?: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) description?: string;
}

export class ExerciseQueryDto {
  @IsOptional() @IsString() @MaxLength(MAX_NAME) q?: string;
}

export class WorkoutSetDto {
  @IsOptional() @IsNumber() @Min(0) @Max(2000) weight?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000) reps?: number;
  /** seconds */
  @IsOptional() @IsInt() @Min(0) @Max(86400) duration?: number;
  @IsOptional() @IsBoolean() completed?: boolean;
}

export class WorkoutExerciseDto {
  @IsUUID() exerciseId: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) notes?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => WorkoutSetDto)
  sets?: WorkoutSetDto[];
}

export class CreateWorkoutDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) notes?: string;
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsDateString() endedAt?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => WorkoutExerciseDto)
  exercises?: WorkoutExerciseDto[];
}

export class UpdateWorkoutDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name?: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) notes?: string;
  @IsOptional() @IsDateString() startedAt?: string;
  /** null re-opens a finished workout */
  @IsOptional() @IsDateString() endedAt?: string | null;
  /** When provided, replaces the workout's exercises and sets entirely. */
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => WorkoutExerciseDto)
  exercises?: WorkoutExerciseDto[];
}

export class RangeQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(730) days?: number;
}
