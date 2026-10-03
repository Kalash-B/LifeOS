import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainEvents } from '../../common/events/domain-events.js';
import { UserClock } from '../../common/user-clock.service.js';
import { localDateKey, localMidnightUtc } from '../../common/utils/date.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { monthKeys, nextMonth, savings, savingsRate, sumMoney } from './finance.calc.js';
import {
  CreateExpenseDto,
  CreateFinanceAccountDto,
  CreateIncomeDto,
  CreateInvestmentDto,
  CreateSavingsGoalDto,
  UpdateFinanceAccountDto,
  UpdateInvestmentDto,
  UpdateSavingsGoalDto,
} from './finance.dto.js';

const num = (value: Prisma.Decimal | null | undefined) => (value ? value.toNumber() : 0);

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: UserClock,
    private readonly events: DomainEvents,
  ) {}

  // ─── Accounts ─────────────────────────────────────────────────────────────

  accounts(userId: string) {
    return this.prisma.financeAccount.findMany({ where: { userId }, orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }] });
  }

  createAccount(dto: CreateFinanceAccountDto, userId: string) {
    return this.prisma.financeAccount.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        currency: dto.currency ?? 'INR',
        currentBalance: new Prisma.Decimal(dto.openingBalance ?? 0),
      },
    });
  }

  async updateAccount(id: string, dto: UpdateFinanceAccountDto, userId: string) {
    await this.ownedAccount(id, userId);
    return this.prisma.financeAccount.update({ where: { id }, data: dto });
  }

  async deleteAccount(id: string, userId: string) {
    await this.ownedAccount(id, userId);
    await this.prisma.financeAccount.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  async income(userId: string, month?: string) {
    return this.prisma.income.findMany({
      where: { userId, incomeDate: await this.monthRange(userId, month) },
      include: { account: { select: { id: true, name: true } } },
      orderBy: { incomeDate: 'desc' },
    });
  }

  async createIncome(dto: CreateIncomeDto, userId: string) {
    const account = await this.ownedAccount(dto.accountId, userId);
    const amount = new Prisma.Decimal(dto.amount);
    const [income] = await this.prisma.$transaction([
      this.prisma.income.create({
        data: {
          userId,
          accountId: account.id,
          amount,
          currency: account.currency,
          source: dto.source,
          category: dto.category,
          incomeDate: new Date(dto.incomeDate),
          description: dto.description,
        },
      }),
      this.prisma.financeAccount.update({ where: { id: account.id }, data: { currentBalance: { increment: amount } } }),
    ]);
    this.events.publish({ type: 'INCOME_CREATED', userId, incomeId: income.id });
    return income;
  }

  async deleteIncome(id: string, userId: string) {
    const income = await this.prisma.income.findFirst({ where: { id, userId } });
    if (!income) throw new NotFoundException('Income not found.');
    await this.prisma.$transaction([
      this.prisma.income.delete({ where: { id } }),
      this.prisma.financeAccount.update({
        where: { id: income.accountId },
        data: { currentBalance: { decrement: income.amount } },
      }),
    ]);
    return { deleted: true };
  }

  async expenses(userId: string, month?: string) {
    return this.prisma.expense.findMany({
      where: { userId, expenseDate: await this.monthRange(userId, month) },
      include: { account: { select: { id: true, name: true } } },
      orderBy: { expenseDate: 'desc' },
    });
  }

  async createExpense(dto: CreateExpenseDto, userId: string) {
    const account = await this.ownedAccount(dto.accountId, userId);
    const amount = new Prisma.Decimal(dto.amount);
    const [expense] = await this.prisma.$transaction([
      this.prisma.expense.create({
        data: {
          userId,
          accountId: account.id,
          amount,
          currency: account.currency,
          category: dto.category,
          expenseDate: new Date(dto.expenseDate),
          description: dto.description,
          paymentMethod: dto.paymentMethod,
        },
      }),
      this.prisma.financeAccount.update({ where: { id: account.id }, data: { currentBalance: { decrement: amount } } }),
    ]);
    this.events.publish({ type: 'EXPENSE_CREATED', userId, expenseId: expense.id });
    return expense;
  }

  async deleteExpense(id: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, userId } });
    if (!expense) throw new NotFoundException('Expense not found.');
    await this.prisma.$transaction([
      this.prisma.expense.delete({ where: { id } }),
      this.prisma.financeAccount.update({
        where: { id: expense.accountId },
        data: { currentBalance: { increment: expense.amount } },
      }),
    ]);
    return { deleted: true };
  }

  // ─── Savings goals ────────────────────────────────────────────────────────

  savingsGoals(userId: string) {
    return this.prisma.savingsGoal.findMany({ where: { userId }, orderBy: [{ status: 'asc' }, { createdAt: 'asc' }] });
  }

  createSavingsGoal(dto: CreateSavingsGoalDto, userId: string) {
    return this.prisma.savingsGoal.create({
      data: {
        userId,
        name: dto.name,
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        currentAmount: new Prisma.Decimal(dto.currentAmount ?? 0),
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  async updateSavingsGoal(id: string, dto: UpdateSavingsGoalDto, userId: string) {
    const goal = await this.prisma.savingsGoal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Savings goal not found.');

    const target = dto.targetAmount ?? num(goal.targetAmount);
    const current = dto.currentAmount ?? num(goal.currentAmount);
    const reached = current >= target;
    const updated = await this.prisma.savingsGoal.update({
      where: { id },
      data: {
        name: dto.name,
        targetAmount: dto.targetAmount !== undefined ? new Prisma.Decimal(dto.targetAmount) : undefined,
        currentAmount: dto.currentAmount !== undefined ? new Prisma.Decimal(dto.currentAmount) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        status: dto.status ?? (reached && goal.status === 'ACTIVE' ? 'ACHIEVED' : undefined),
      },
    });

    const before = Math.floor((num(goal.currentAmount) / num(goal.targetAmount)) * 4);
    const after = Math.floor((current / target) * 4);
    if (after > before && after >= 2) {
      this.events.publish({ type: 'SAVINGS_MILESTONE', userId, goalId: id, goalName: goal.name, percent: Math.min(100, after * 25) });
    }
    return updated;
  }

  async deleteSavingsGoal(id: string, userId: string) {
    const { count } = await this.prisma.savingsGoal.deleteMany({ where: { id, userId } });
    if (!count) throw new NotFoundException('Savings goal not found.');
    return { deleted: true };
  }

  // ─── Investments ──────────────────────────────────────────────────────────

  investments(userId: string) {
    return this.prisma.investment.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  createInvestment(dto: CreateInvestmentDto, userId: string) {
    return this.prisma.investment.create({
      data: {
        userId,
        name: dto.name,
        assetType: dto.assetType,
        amountInvested: new Prisma.Decimal(dto.amountInvested),
        currentValue: new Prisma.Decimal(dto.currentValue ?? dto.amountInvested),
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  async updateInvestment(id: string, dto: UpdateInvestmentDto, userId: string) {
    const investment = await this.prisma.investment.findFirst({ where: { id, userId } });
    if (!investment) throw new NotFoundException('Investment not found.');
    return this.prisma.investment.update({
      where: { id },
      data: {
        name: dto.name,
        notes: dto.notes,
        currentValue: dto.currentValue !== undefined ? new Prisma.Decimal(dto.currentValue) : undefined,
      },
    });
  }

  async deleteInvestment(id: string, userId: string) {
    const { count } = await this.prisma.investment.deleteMany({ where: { id, userId } });
    if (!count) throw new NotFoundException('Investment not found.');
    return { deleted: true };
  }

  // ─── Summary / reports ────────────────────────────────────────────────────

  async summary(userId: string, month?: string) {
    const { today, timezone } = await this.clock.today(userId);
    const current = month ?? today.slice(0, 7);
    const months = monthKeys(current, 6);
    const from = localMidnightUtc(`${months[0]}-01`, timezone);
    const to = localMidnightUtc(`${nextMonth(current)}-01`, timezone);

    const [incomes, expenses, accounts, goals, investments, settings] = await Promise.all([
      this.prisma.income.findMany({ where: { userId, incomeDate: { gte: from, lt: to } }, select: { amount: true, incomeDate: true, category: true } }),
      this.prisma.expense.findMany({ where: { userId, expenseDate: { gte: from, lt: to } }, select: { amount: true, expenseDate: true, category: true } }),
      this.prisma.financeAccount.findMany({ where: { userId, isActive: true }, select: { currentBalance: true, currency: true } }),
      this.prisma.savingsGoal.findMany({ where: { userId, status: 'ACTIVE' }, select: { targetAmount: true, currentAmount: true } }),
      this.prisma.investment.findMany({ where: { userId }, select: { amountInvested: true, currentValue: true } }),
      this.prisma.userSettings.findUnique({ where: { userId }, select: { currency: true } }),
    ]);

    const monthOf = (date: Date) => localDateKey(date, timezone).slice(0, 7);
    const trend = months.map((key) => {
      const income = sumMoney(incomes.filter((entry) => monthOf(entry.incomeDate) === key).map((entry) => num(entry.amount)));
      const expense = sumMoney(expenses.filter((entry) => monthOf(entry.expenseDate) === key).map((entry) => num(entry.amount)));
      return { month: key, income, expenses: expense, savings: savings(income, expense) };
    });
    const thisMonth = trend.at(-1)!;

    const categories = new Map<string, number>();
    for (const expense of expenses.filter((entry) => monthOf(entry.expenseDate) === current)) {
      categories.set(expense.category, sumMoney([categories.get(expense.category) ?? 0, num(expense.amount)]));
    }

    const invested = sumMoney(investments.map((entry) => num(entry.amountInvested)));
    const investmentValue = sumMoney(investments.map((entry) => num(entry.currentValue)));

    return {
      month: current,
      currency: settings?.currency ?? 'INR',
      income: thisMonth.income,
      expenses: thisMonth.expenses,
      savings: thisMonth.savings,
      savingsRate: savingsRate(thisMonth.income, thisMonth.expenses),
      totalBalance: sumMoney(accounts.map((account) => num(account.currentBalance))),
      accountCount: accounts.length,
      expensesByCategory: [...categories.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      trend,
      savingsGoals: {
        count: goals.length,
        target: sumMoney(goals.map((goal) => num(goal.targetAmount))),
        saved: sumMoney(goals.map((goal) => num(goal.currentAmount))),
      },
      investments: { invested, currentValue: investmentValue, gain: savings(investmentValue, invested) },
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Spec §35: the account must belong to the authenticated user. */
  private async ownedAccount(id: string, userId: string) {
    const account = await this.prisma.financeAccount.findFirst({ where: { id, userId } });
    if (!account) throw new NotFoundException('Finance account not found.');
    if (!account.isActive) throw new BadRequestException('This account is archived.');
    return account;
  }

  private async monthRange(userId: string, month?: string) {
    const { today, timezone } = await this.clock.today(userId);
    const key = month ?? today.slice(0, 7);
    return { gte: localMidnightUtc(`${key}-01`, timezone), lt: localMidnightUtc(`${nextMonth(key)}-01`, timezone) };
  }
}
