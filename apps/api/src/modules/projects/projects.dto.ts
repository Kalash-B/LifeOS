import { PartialType } from '@nestjs/swagger';
import { MilestoneStatus, Priority, ProjectCategory, ProjectStatus, TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
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

const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value);

export class CreateProjectDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) description?: string;
  @Transform(upper) @IsEnum(ProjectCategory) category: ProjectCategory;
  @IsOptional() @Transform(upper) @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @Transform(upper) @IsEnum(Priority) priority?: Priority;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() deadline?: string;
  /** Setting progress manually switches the project to manual progress. */
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsBoolean() autoProgress?: boolean;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class CreateTaskDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) description?: string;
  @IsOptional() @Transform(upper) @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @Transform(upper) @IsEnum(Priority) priority?: Priority;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

/** Sending `dueDate: null` clears the due date. */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class TaskQueryDto {
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsIn(['today', 'overdue', 'week', 'open']) view?: 'today' | 'overdue' | 'week' | 'open';
  @IsOptional() @IsUUID() projectId?: string;
}

export class CreateMilestoneDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) description?: string;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsEnum(MilestoneStatus) status?: MilestoneStatus;
}

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {}
