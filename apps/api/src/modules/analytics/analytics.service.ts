import { Injectable } from '@nestjs/common';
import { UserClock } from '../../common/user-clock.service.js';
import {
  addDays,
  dateKeyToDate,
  dateKeysBetween,
  dateToKey,
  localDateKey,
  localMidnightUtc,
  localRangeUtc,
  startOfMonth,
  startOfWeek,
} from '../../common/utils/date.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { nextMonth, savings, sumMoney } from '../finance/finance.calc.js';
import { FinanceService } from '../finance/finance.service.js';
import { FitnessService } from '../fitness/fitness.service.js';
import { isScheduled } from '../habits/habits.streak.js';
import { LearningService } from '../learning/learning.service.js';
import { occursOn } from '../routine/routine.recurrence.js';
import { UsersService } from '../users/users.service.js';
import { computeScore, type ScoreResult } from './score.js';

/** Weekly workout count treated as "fully on track" for the fitness score component. */
const WORKOUTS_PER_WEEK_TARGET = 3;

export interface DayMetrics {
  date: string;
  routine: { scheduled: number; completed: number };
  habits: { due: number; completed: number };
  learningMinutes: number;
  workouts: number;
  /** workouts in the 7 days ending on this date */
  workoutsLast7: number;
  tasks: { completed: number; due: number };
  finance: { income: number; expenses: number; monthIncome: number; monthExpenses: number };
  score: ScoreResult | null;
}

const rate = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

/**
 * Analytics engine (spec §19, §31): every metric is derived from source tables
 * with one bounded query per module, bucketed by the user's local date.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: UserClock,
    private readonly users: UsersService,
    private readonly fitness: FitnessService,
    private readonly learning: LearningService,
    private readonly finance: FinanceService,
  ) {}

  /** Per-day metrics (and score) for an inclusive local date range. */
  async series(userId: string, fromKey: string, toKey: string, timezone: string): Promise<DayMetrics[]> {
    const range = localRangeUtc(fromKey, toKey, timezone);
    const fitnessFrom = localMidnightUtc(addDays(fromKey, -6), timezone);
    const monthFrom = localMidnightUtc(startOfMonth(fromKey), timezone);
    const habitWeekFrom = dateKeyToDate(startOfWeek(fromKey));

    const [settings, routineItems, routineLogs, habits, habitLogs, sessions, workouts, tasks, incomes, expenses] = await Promise.all([
      this.users.getSettings(userId),
      this.prisma.routineItem.findMany({
        where: { routine: { userId, isActive: true } },
        select: { recurrenceRule: true, createdAt: true },
      }),
      this.prisma.routineLog.findMany({
        where: { userId, status: 'COMPLETED', date: { gte: dateKeyToDate(fromKey), lte: dateKeyToDate(toKey) } },
        select: { date: true },
      }),
      this.prisma.habit.findMany({
        where: { userId, isActive: true },
        select: { id: true, frequencyType: true, targetValue: true, createdAt: true },
      }),
      this.prisma.habitLog.findMany({
        where: { userId, status: 'COMPLETED', date: { gte: habitWeekFrom, lte: dateKeyToDate(toKey) } },
        select: { habitId: true, date: true },
      }),
      this.prisma.learningSession.findMany({
        where: { userId, startedAt: { gte: range.start, lt: range.end } },
        select: { startedAt: true, durationMinutes: true },
      }),
      this.prisma.workout.findMany({
        where: { userId, startedAt: { gte: fitnessFrom, lt: range.end } },
        select: { startedAt: true },
      }),
      this.prisma.task.findMany({
        where: {
          userId,
          OR: [
            { completedAt: { gte: range.start, lt: range.end } },
            { dueDate: { lt: range.end }, OR: [{ completedAt: null }, { completedAt: { gte: range.start } }] },
          ],
        },
        select: { dueDate: true, completedAt: true },
      }),
      this.prisma.income.findMany({
        where: { userId, incomeDate: { gte: monthFrom, lt: range.end } },
        select: { amount: true, incomeDate: true },
      }),
      this.prisma.expense.findMany({
        where: { userId, expenseDate: { gte: monthFrom, lt: range.end } },
        select: { amount: true, expenseDate: true },
      }),
    ]);

    const local = (date: Date) => localDateKey(date, timezone);
    const sessionDays = sessions.map((s) => ({ day: local(s.startedAt), minutes: s.durationMinutes ?? 0 }));
    const workoutDays = workouts.map((w) => local(w.startedAt));
    const incomeDays = incomes.map((i) => ({ day: local(i.incomeDate), amount: i.amount.toNumber() }));
    const expenseDays = expenses.map((e) => ({ day: local(e.expenseDate), amount: e.amount.toNumber() }));
    const routineDone = new Map<string, number>();
    for (const log of routineLogs) routineDone.set(dateToKey(log.date), (routineDone.get(dateToKey(log.date)) ?? 0) + 1);
    const habitDone = new Set(habitLogs.map((log) => `${log.habitId}|${dateToKey(log.date)}`));
    // A habit counts from its creation date, or from earlier logged history if the user backfilled.
    const habitStart = new Map(
      habits.map((h) => {
        const first = habitLogs.filter((log) => log.habitId === h.id).map((log) => dateToKey(log.date)).sort()[0];
        const created = local(h.createdAt);
        return [h.id, first && first < created ? first : created];
      }),
    );

    return dateKeysBetween(fromKey, toKey).map((date): DayMetrics => {
      const dayStart = localMidnightUtc(date, timezone);
      const dayEnd = localMidnightUtc(addDays(date, 1), timezone);

      // Routine
      const scheduled = routineItems.filter(
        (item) => local(item.createdAt) <= date && occursOn(item.recurrenceRule, date),
      ).length;
      const routineCompleted = Math.min(scheduled, routineDone.get(date) ?? 0);

      // Habits: daily/weekday habits count per scheduled day; weekly habits count
      // fractional progress toward this week's target.
      let habitsDue = 0;
      let habitsCompleted = 0;
      for (const habit of habits.filter((h) => habitStart.get(h.id)! <= date)) {
        if (habit.frequencyType === 'WEEKLY') {
          const target = Math.max(1, Math.round(habit.targetValue ?? 1));
          const doneThisWeek = dateKeysBetween(startOfWeek(date), date).filter((key) => habitDone.has(`${habit.id}|${key}`)).length;
          habitsDue += 1;
          habitsCompleted += Math.min(1, doneThisWeek / target);
        } else if (isScheduled(habit.frequencyType, date)) {
          habitsDue += 1;
          if (habitDone.has(`${habit.id}|${date}`)) habitsCompleted += 1;
        }
      }

      const learningMinutes = sessionDays.filter((s) => s.day === date).reduce((sum, s) => sum + s.minutes, 0);
      const workoutCount = workoutDays.filter((day) => day === date).length;
      const workoutsLast7 = workoutDays.filter((day) => day > addDays(date, -7) && day <= date).length;

      // Tasks open going into the day and due by its end, plus tasks completed that day.
      const tasksCompleted = tasks.filter((t) => t.completedAt && t.completedAt >= dayStart && t.completedAt < dayEnd).length;
      const tasksOpenDue = tasks.filter(
        (t) => t.dueDate && t.dueDate < dayEnd && (!t.completedAt || t.completedAt >= dayEnd),
      ).length;

      const monthKey = date.slice(0, 7);
      const income = sumMoney(incomeDays.filter((i) => i.day === date).map((i) => i.amount));
      const expense = sumMoney(expenseDays.filter((e) => e.day === date).map((e) => e.amount));
      const monthIncome = sumMoney(incomeDays.filter((i) => i.day.startsWith(monthKey) && i.day <= date).map((i) => i.amount));
      const monthExpenses = sumMoney(expenseDays.filter((e) => e.day.startsWith(monthKey) && e.day <= date).map((e) => e.amount));

      const studyGoal = settings.dailyStudyGoalMin;
      const taskDenominator = tasksCompleted + tasksOpenDue;
      const score = settings.scoreEnabled
        ? computeScore(
            {
              routine: {
                value: scheduled ? routineCompleted / scheduled : null,
                explanation: scheduled ? `${routineCompleted} of ${scheduled} routine items completed` : 'No routine items scheduled',
              },
              habits: {
                value: habitsDue ? habitsCompleted / habitsDue : null,
                explanation: habitsDue
                  ? `${Math.round(habitsCompleted * 10) / 10} of ${habitsDue} habits on track`
                  : 'No active habits',
              },
              fitness: {
                value: Math.min(1, workoutsLast7 / WORKOUTS_PER_WEEK_TARGET),
                explanation: `${workoutsLast7} workouts in the last 7 days (target ${WORKOUTS_PER_WEEK_TARGET})`,
              },
              learning: {
                value: studyGoal > 0 ? learningMinutes / studyGoal : null,
                explanation: studyGoal > 0 ? `${learningMinutes} of ${studyGoal} study minutes` : 'No daily study goal set',
              },
              projects: {
                value: taskDenominator ? tasksCompleted / taskDenominator : null,
                explanation: taskDenominator
                  ? `${tasksCompleted} tasks completed, ${tasksOpenDue} due and still open`
                  : 'No tasks due or completed',
              },
              finance: {
                value: monthIncome > 0 ? Math.max(0, savings(monthIncome, monthExpenses) / monthIncome) : null,
                explanation:
                  monthIncome > 0
                    ? `Month-to-date savings rate ${Math.round((savings(monthIncome, monthExpenses) / monthIncome) * 100)}%`
                    : 'No income recorded this month',
              },
            },
            settings.scoreWeights,
          )
        : null;

      return {
        date,
        routine: { scheduled, completed: routineCompleted },
        habits: { due: habitsDue, completed: Math.round(habitsCompleted * 10) / 10 },
        learningMinutes,
        workouts: workoutCount,
        workoutsLast7,
        tasks: { completed: tasksCompleted, due: tasksOpenDue },
        finance: { income, expenses: expense, monthIncome, monthExpenses },
        score,
      };
    });
  }

  async daily(userId: string, date?: string) {
    const { today, timezone } = await this.clock.today(userId);
    const [metrics] = await this.series(userId, date ?? today, date ?? today, timezone);
    return {
      date: metrics.date,
      plannedTasks: metrics.routine.scheduled + metrics.tasks.completed + metrics.tasks.due,
      completedTasks: metrics.routine.completed + metrics.tasks.completed,
      routineCompletionRate: rate(metrics.routine.completed, metrics.routine.scheduled),
      habitCompletionRate: rate(metrics.habits.completed, metrics.habits.due),
      studyMinutes: metrics.learningMinutes,
      workoutCompleted: metrics.workouts > 0,
      projectTasksCompleted: metrics.tasks.completed,
      income: metrics.finance.income,
      expenses: metrics.finance.expenses,
      metrics,
      score: metrics.score,
    };
  }

  async weekly(userId: string) {
    const { today, timezone } = await this.clock.today(userId);
    const days = await this.series(userId, addDays(today, -6), today, timezone);
    const sum = (pick: (day: DayMetrics) => number) => days.reduce((total, day) => total + pick(day), 0);
    const projects = await this.prisma.project.findMany({
      where: { userId, status: { in: ['ACTIVE', 'PLANNING', 'BLOCKED'] } },
      select: { progress: true },
    });
    const income = sumMoney(days.map((d) => d.finance.income));
    const expenses = sumMoney(days.map((d) => d.finance.expenses));
    const scored = days.filter((d) => d.score?.score != null);
    return {
      from: days[0].date,
      to: today,
      weeklyCompletionRate: rate(sum((d) => d.routine.completed + d.tasks.completed), sum((d) => d.routine.scheduled + d.tasks.completed + d.tasks.due)),
      habitCompletionRate: rate(sum((d) => d.habits.completed), sum((d) => d.habits.due)),
      studyHours: Math.round((sum((d) => d.learningMinutes) / 60) * 10) / 10,
      workoutCount: sum((d) => d.workouts),
      tasksCompleted: sum((d) => d.tasks.completed),
      projectProgress: projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : null,
      financialSummary: { income, expenses, savings: savings(income, expenses) },
      averageScore: scored.length ? Math.round(scored.reduce((s, d) => s + (d.score!.score ?? 0), 0) / scored.length) : null,
      days: days.map((day) => this.compactDay(day)),
    };
  }

  async monthly(userId: string, month?: string) {
    const { today, timezone } = await this.clock.today(userId);
    const monthKey = month ?? today.slice(0, 7);
    const from = `${monthKey}-01`;
    const lastDay = addDays(`${nextMonth(monthKey)}-01`, -1);
    const to = lastDay < today ? lastDay : today;
    if (from > to) return { month: monthKey, days: [] };

    const [days, weights, projectsCompleted] = await Promise.all([
      this.series(userId, from, to, timezone),
      this.prisma.weightLog.findMany({
        where: { userId, recordedAt: { gte: localMidnightUtc(from, timezone), lt: localMidnightUtc(addDays(to, 1), timezone) } },
        orderBy: { recordedAt: 'asc' },
        select: { weight: true },
      }),
      this.prisma.project.count({
        where: { userId, status: 'COMPLETED', updatedAt: { gte: localMidnightUtc(from, timezone) } },
      }),
    ]);
    const sum = (pick: (day: DayMetrics) => number) => days.reduce((total, day) => total + pick(day), 0);
    const last = days.at(-1)!;
    const scored = days.filter((d) => d.score?.score != null);
    return {
      month: monthKey,
      monthlyProductivity: rate(sum((d) => d.routine.completed + d.tasks.completed), sum((d) => d.routine.scheduled + d.tasks.completed + d.tasks.due)),
      habitCompletionRate: rate(sum((d) => d.habits.completed), sum((d) => d.habits.due)),
      learningHours: Math.round((sum((d) => d.learningMinutes) / 60) * 10) / 10,
      workoutCount: sum((d) => d.workouts),
      fitnessTrend: weights.length >= 2 ? Math.round((weights.at(-1)!.weight - weights[0].weight) * 10) / 10 : null,
      tasksCompleted: sum((d) => d.tasks.completed),
      projectsCompleted,
      income: last.finance.monthIncome,
      expenses: last.finance.monthExpenses,
      savings: savings(last.finance.monthIncome, last.finance.monthExpenses),
      averageScore: scored.length ? Math.round(scored.reduce((s, d) => s + (d.score!.score ?? 0), 0) / scored.length) : null,
      days: days.map((day) => this.compactDay(day)),
    };
  }

  async productivity(userId: string, days = 30) {
    const { today, timezone } = await this.clock.today(userId);
    const series = await this.series(userId, addDays(today, -(days - 1)), today, timezone);
    return { days: series.map((day) => this.compactDay(day)) };
  }

  async score(userId: string, date?: string) {
    const { today, timezone } = await this.clock.today(userId);
    const [metrics] = await this.series(userId, date ?? today, date ?? today, timezone);
    const settings = await this.users.getSettings(userId);
    return { date: metrics.date, enabled: settings.scoreEnabled, weights: settings.scoreWeights, ...metrics.score };
  }

  fitnessAnalytics(userId: string) {
    return this.fitness.progress(userId);
  }

  learningAnalytics(userId: string) {
    return this.learning.stats(userId, 30);
  }

  financeAnalytics(userId: string) {
    return this.finance.summary(userId);
  }

  async projectsAnalytics(userId: string) {
    const { today, timezone } = await this.clock.today(userId);
    const [projects, completedTasks] = await Promise.all([
      this.prisma.project.findMany({
        where: { userId },
        select: { id: true, name: true, status: true, progress: true, deadline: true, category: true },
      }),
      this.prisma.task.findMany({
        where: { userId, completedAt: { gte: localMidnightUtc(addDays(startOfWeek(today), -7 * 7), timezone) } },
        select: { completedAt: true },
      }),
    ]);
    const now = new Date();
    const velocity = Array.from({ length: 8 }, (_, index) => {
      const week = addDays(startOfWeek(today), -7 * (7 - index));
      return {
        week,
        completed: completedTasks.filter((task) => startOfWeek(localDateKey(task.completedAt!, timezone)) === week).length,
      };
    });
    const byStatus = projects.reduce<Record<string, number>>((acc, project) => {
      acc[project.status] = (acc[project.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: projects.length,
      byStatus,
      averageProgress: projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0,
      upcomingDeadlines: projects
        .filter((p) => p.deadline && p.deadline >= now && p.status !== 'COMPLETED' && p.status !== 'ARCHIVED')
        .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime())
        .slice(0, 5),
      overdue: projects.filter((p) => p.deadline && p.deadline < now && !['COMPLETED', 'ARCHIVED'].includes(p.status)).length,
      velocity,
    };
  }

  private compactDay(day: DayMetrics) {
    return {
      date: day.date,
      // null = nothing was scheduled that day (not the same as 0% done)
      routineRate: day.routine.scheduled ? rate(day.routine.completed, day.routine.scheduled) : null,
      habitRate: day.habits.due ? rate(day.habits.completed, day.habits.due) : null,
      studyMinutes: day.learningMinutes,
      workouts: day.workouts,
      tasksCompleted: day.tasks.completed,
      income: day.finance.income,
      expenses: day.finance.expenses,
      score: day.score?.score ?? null,
    };
  }
}
