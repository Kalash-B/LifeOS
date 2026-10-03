import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsTimeZone, MAX_NAME } from '../../common/validation.js';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NAME)
  displayName?: string;

  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;

  /** "Keep me logged in" (default true). */
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
