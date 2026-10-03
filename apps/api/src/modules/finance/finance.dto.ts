import { FinanceAccountType, SavingsGoalStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_NAME, MAX_TEXT } from '../../common/validation.js';

const MAX_AMOUNT = 999_999_999_999;
const money = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false };
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value);
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED'];

export class CreateFinanceAccountDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name: string;
  @Transform(upper) @IsEnum(FinanceAccountType) type: FinanceAccountType;
  @IsOptional() @Transform(upper) @IsIn(CURRENCIES) currency?: string;
  /** Opening balance; may be negative (e.g. an overdrawn account). */
  @IsOptional() @IsNumber(money) @Min(-MAX_AMOUNT) @Max(MAX_AMOUNT) openingBalance?: number;
}

export class UpdateFinanceAccountDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name?: string;
  @IsOptional() @Transform(upper) @IsEnum(FinanceAccountType) type?: FinanceAccountType;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateIncomeDto {
  @IsUUID() accountId: string;
  @IsNumber(money) @IsPositive() @Max(MAX_AMOUNT) amount: number;
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) source: string;
  @IsString() @IsNotEmpty() @MaxLength(50) category: string;
  @IsDateString() incomeDate: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) description?: string;
}

export class CreateExpenseDto {
  @IsUUID() accountId: string;
  @IsNumber(money) @IsPositive() @Max(MAX_AMOUNT) amount: number;
  @IsString() @IsNotEmpty() @MaxLength(50) category: string;
  @IsDateString() expenseDate: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) description?: string;
  @IsOptional() @IsString() @MaxLength(30) paymentMethod?: string;
}

export class CreateSavingsGoalDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name: string;
  @IsNumber(money) @IsPositive() @Max(MAX_AMOUNT) targetAmount: number;
  @IsOptional() @IsNumber(money) @Min(0) @Max(MAX_AMOUNT) currentAmount?: number;
  @IsOptional() @IsDateString() targetDate?: string;
}

export class UpdateSavingsGoalDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name?: string;
  @IsOptional() @IsNumber(money) @IsPositive() @Max(MAX_AMOUNT) targetAmount?: number;
  @IsOptional() @IsNumber(money) @Min(0) @Max(MAX_AMOUNT) currentAmount?: number;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsEnum(SavingsGoalStatus) status?: SavingsGoalStatus;
}

export class CreateInvestmentDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name: string;
  @IsString() @IsNotEmpty() @MaxLength(50) assetType: string;
  @IsNumber(money) @IsPositive() @Max(MAX_AMOUNT) amountInvested: number;
  @IsOptional() @IsNumber(money) @Min(0) @Max(MAX_AMOUNT) currentValue?: number;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) notes?: string;
}

export class UpdateInvestmentDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(MAX_NAME) name?: string;
  @IsOptional() @IsNumber(money) @Min(0) @Max(MAX_AMOUNT) currentValue?: number;
  @IsOptional() @IsString() @MaxLength(MAX_TEXT) notes?: string;
}

export class MonthQueryDto {
  /** YYYY-MM in the user's timezone; defaults to the current month. */
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be YYYY-MM' }) month?: string;
}
