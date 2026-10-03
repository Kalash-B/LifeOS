import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import {
  CreateExpenseDto,
  CreateFinanceAccountDto,
  CreateIncomeDto,
  CreateInvestmentDto,
  CreateSavingsGoalDto,
  MonthQueryDto,
  UpdateFinanceAccountDto,
  UpdateInvestmentDto,
  UpdateSavingsGoalDto,
} from './finance.dto.js';
import { FinanceService } from './finance.service.js';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query() query: MonthQueryDto) {
    return this.finance.summary(user.id, query.month);
  }

  @Get('accounts')
  accounts(@CurrentUser() user: AuthUser) {
    return this.finance.accounts(user.id);
  }

  @Post('accounts')
  createAccount(@CurrentUser() user: AuthUser, @Body() dto: CreateFinanceAccountDto) {
    return this.finance.createAccount(dto, user.id);
  }

  @Patch('accounts/:id')
  updateAccount(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFinanceAccountDto) {
    return this.finance.updateAccount(id, dto, user.id);
  }

  @Delete('accounts/:id')
  deleteAccount(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.finance.deleteAccount(id, user.id);
  }

  @Get('income')
  income(@CurrentUser() user: AuthUser, @Query() query: MonthQueryDto) {
    return this.finance.income(user.id, query.month);
  }

  @Post('income')
  createIncome(@CurrentUser() user: AuthUser, @Body() dto: CreateIncomeDto) {
    return this.finance.createIncome(dto, user.id);
  }

  @Delete('income/:id')
  deleteIncome(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.finance.deleteIncome(id, user.id);
  }

  @Get('expenses')
  expenses(@CurrentUser() user: AuthUser, @Query() query: MonthQueryDto) {
    return this.finance.expenses(user.id, query.month);
  }

  @Post('expenses')
  createExpense(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.finance.createExpense(dto, user.id);
  }

  @Delete('expenses/:id')
  deleteExpense(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.finance.deleteExpense(id, user.id);
  }

  @Get('savings')
  savingsGoals(@CurrentUser() user: AuthUser) {
    return this.finance.savingsGoals(user.id);
  }

  @Post('savings')
  createSavingsGoal(@CurrentUser() user: AuthUser, @Body() dto: CreateSavingsGoalDto) {
    return this.finance.createSavingsGoal(dto, user.id);
  }

  @Patch('savings/:id')
  updateSavingsGoal(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSavingsGoalDto) {
    return this.finance.updateSavingsGoal(id, dto, user.id);
  }

  @Delete('savings/:id')
  deleteSavingsGoal(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.finance.deleteSavingsGoal(id, user.id);
  }

  @Get('investments')
  investments(@CurrentUser() user: AuthUser) {
    return this.finance.investments(user.id);
  }

  @Post('investments')
  createInvestment(@CurrentUser() user: AuthUser, @Body() dto: CreateInvestmentDto) {
    return this.finance.createInvestment(dto, user.id);
  }

  @Patch('investments/:id')
  updateInvestment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInvestmentDto) {
    return this.finance.updateInvestment(id, dto, user.id);
  }

  @Delete('investments/:id')
  deleteInvestment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.finance.deleteInvestment(id, user.id);
  }
}
