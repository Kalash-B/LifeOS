import { Injectable, NotFoundException } from '@nestjs/common';
import type { Habit } from '@prisma/client';
import { DomainEvents } from '../../common/events/domain-events.js';
import { UserClock } from '../../common/user-clock.service.js';
import { addDays, dateKeyToDate, dateToKey, localDateKey } from '../../common/utils/date.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateHabitDto, LogHabitDto, UpdateHabitDto } from './habits.dto.js';
import { calculateStreak, completionRate, isScheduled } from './habits.streak.js';

/** How far back streaks are evaluated. */
const STREAK_LOOKBACK_DAYS = 400;

@Injectable()
export class HabitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: UserClock,
    private readonly events: DomainEvents,
  ) {}

  async list(userId: string, includeArchived = false) {
    const { today, timezone } = await this.clock.today(userId);
    const habits = await this.prisma.habit.findMany({
      where: { userId, ...(includeArchived ? {} : { isActive: true }) },
      orderBy: { createdAt: 'asc' },
    });
    const logs = await this.prisma.habitLog.findMany({
      where: {
        userId,
        habitId: { in: habits.map((habit) => habit.id) },
        date: { gte: dateKeyToDate(addDays(today, -STREAK_LOOKBACK_DAYS)) },
      },
      select: { habitId: true, date: true, status: true, value: true },
    });

    return habits.map((habit) => {
      const own = logs.filter((log) => log.habitId === habit.id);
      const completedDates = own.filter((log) => log.status === 'COMPLETED').map((log) => dateToKey(log.date));
      const input = this.streakInput(habit, completedDates, today, timezone);
      const todayLog = own.find((log) => dateToKey(log.date) === today);
      const last7 = Array.from({ length: 7 }, (_, index) => {
        const date = addDays(today, index - 6);
        return {
          date,
          status: own.find((log) => dateToKey(log.date) === date)?.status ?? null,
          scheduled: isScheduled(habit.frequencyType, date),
        };
      });
      return {
        ...habit,
        todayStatus: todayLog?.status ?? 'PENDING',
        todayValue: todayLog?.value ?? null,
        scheduledToday: isScheduled(habit.frequencyType, today),
        streak: calculateStreak(input),
        completionRate30: completionRate(input, 30),
        last7,
      };
    });
  }

  async get(id: string, userId: string) {
    const habit = await this.prisma.habit.findFirst({ where: { id, userId } });
    if (!habit) throw new NotFoundException('Habit not found.');
    return habit;
  }

  create(dto: CreateHabitDto, userId: string) {
    return this.prisma.habit.create({ data: { ...dto, userId } });
  }

  async update(id: string, dto: UpdateHabitDto, userId: string) {
    await this.get(id, userId);
    return this.prisma.habit.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.get(id, userId);
    await this.prisma.habit.delete({ where: { id } });
    return { deleted: true };
  }

  async log(id: string, dto: LogHabitDto, userId: string) {
    const habit = await this.get(id, userId);
    const date = dateKeyToDate(dto.date);
    const status = dto.status ?? 'COMPLETED';
    const log = await this.prisma.habitLog.upsert({
      where: { habitId_date: { habitId: id, date } },
      update: { status, value: dto.value, notes: dto.notes },
      create: { habitId: id, userId, date, status, value: dto.value, notes: dto.notes },
    });
    if (status === 'COMPLETED') {
      this.events.publish({ type: 'HABIT_COMPLETED', userId, habitId: id, habitName: habit.name, date: dto.date });
    }
    return log;
  }

  async stats(id: string, userId: string) {
    const habit = await this.get(id, userId);
    const { today, timezone } = await this.clock.today(userId);
    const logs = await this.prisma.habitLog.findMany({
      where: { habitId: id, userId, date: { gte: dateKeyToDate(addDays(today, -STREAK_LOOKBACK_DAYS)) } },
      orderBy: { date: 'asc' },
    });
    const completedDates = logs.filter((log) => log.status === 'COMPLETED').map((log) => dateToKey(log.date));
    const input = this.streakInput(habit, completedDates, today, timezone);
    const historyFrom = addDays(today, -89);
    return {
      habitId: id,
      streak: calculateStreak(input),
      completionRate7: completionRate(input, 7),
      completionRate30: completionRate(input, 30),
      totalCompletions: completedDates.length,
      history: logs
        .filter((log) => dateToKey(log.date) >= historyFrom)
        .map((log) => ({ date: dateToKey(log.date), status: log.status, value: log.value, notes: log.notes })),
    };
  }

  private streakInput(habit: Habit, completedDates: string[], today: string, timezone: string) {
    return {
      frequency: habit.frequencyType,
      weeklyTarget: habit.targetValue,
      completedDates,
      today,
      createdOn: localDateKey(habit.createdAt, timezone),
    };
  }
}
