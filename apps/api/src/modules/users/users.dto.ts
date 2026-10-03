import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsTimeOfDay, IsTimeZone, MAX_NAME, MAX_TEXT } from '../../common/validation.js';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(MAX_NAME) displayName?: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) bio?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(500) avatarUrl?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(10) preferredLanguage?: string;
  @IsOptional() @IsTimeZone() timezone?: string;
}

export class ScoreWeightsDto {
  @IsInt() @Min(0) @Max(100) routine: number;
  @IsInt() @Min(0) @Max(100) habits: number;
  @IsInt() @Min(0) @Max(100) fitness: number;
  @IsInt() @Min(0) @Max(100) learning: number;
  @IsInt() @Min(0) @Max(100) projects: number;
  @IsInt() @Min(0) @Max(100) finance: number;
}

export class UpdateSettingsDto {
  @IsOptional() @IsBoolean() scoreEnabled?: boolean;
  @IsOptional() @ValidateNested() @Type(() => ScoreWeightsDto) scoreWeights?: ScoreWeightsDto;
  /** null clears quiet hours */
  @IsOptional() @IsTimeOfDay() quietHoursStart?: string | null;
  @IsOptional() @IsTimeOfDay() quietHoursEnd?: string | null;
  @IsOptional() @IsBoolean() dailySummary?: boolean;
  @IsOptional() @IsBoolean() weeklySummary?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(24 * 60) dailyStudyGoalMin?: number;
  @IsOptional() @IsString() @IsIn(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED']) currency?: string;
}

export class ChangePasswordDto {
  @IsString() @MinLength(1) @MaxLength(128) currentPassword: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword: string;
}

export class DeleteAccountDto {
  @IsString() @MinLength(1) @MaxLength(128) password: string;
}
