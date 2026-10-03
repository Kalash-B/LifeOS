import { NotificationChannel, NotificationPriority, NotificationStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_NAME, MAX_TEXT } from '../../common/validation.js';
import { NOTIFICATION_TYPES } from './notifications.types.js';

export class PreferenceDto {
  @IsEnum(NotificationChannel) channel: NotificationChannel;
  @IsIn([...NOTIFICATION_TYPES, 'ALL']) category: string;
  @IsBoolean() enabled: boolean;
}

export class UpdatePreferencesDto {
  @IsArray() @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => PreferenceDto)
  preferences: PreferenceDto[];
}

/** A user-scheduled reminder. */
export class CreateReminderDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) title: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) message?: string;
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsEnum(NotificationPriority) priority?: NotificationPriority;
}

export class NotificationQueryDto {
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() unread?: boolean;
  @IsOptional() @IsEnum(NotificationStatus) status?: NotificationStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
