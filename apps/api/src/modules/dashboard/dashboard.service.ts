import { Injectable } from '@nestjs/common';
import { UserClock } from '../../common/user-clock.service.js';
import { localDayRangeUtc } from '../../common/utils/date.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { FinanceService } from '../finance/finance.service.js';
import { HabitsService } from '../habits/habits.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { RoutineService } from '../routine/routine.service.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: UserClock,
    private readonly routine: RoutineService,
    private readonly habits: HabitsService,
    private readonly projects: ProjectsService,
    private readonly analytics: AnalyticsService,
    private readonly finance: FinanceService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Everything needed for "today": schedule, habits, due tasks, score. */
  async today(userId: string) {
    const { today, timezone } = await this.clock.today(userId);
    const range = localDayRangeUtc(today, timezone);
    const [routine, habits, tasks, daily, workoutToday, profile, settings, unread] = await Promise.all([
      this.routine.day(userId, today),
      this.habits.list(userId),
      this.projects.tasks(userId, { view: 'today' }),
      this.analytics.daily(userId, today),
      this.prisma.workout.findFirst({
        where: { userId, startedAt: { gte: range.start, lt: range.end } },
        select: { id: true, name: true, endedAt: true },
      }),
      this.prisma.profile.findUnique({ where: { userId }, select: { displayName: true } }),
      this.prisma.userSettings.findUnique({ where: { userId }, select: { dailyStudyGoalMin: true } }),
      this.notifications.unreadCount(userId),
    ]);
    const dueHabits = habits.filter((habit) => habit.scheduledToday);
    return {
      date: today,
      timezone,
      displayName: profile?.displayName ?? null,
      routine,
      habits: {
        items: habits,
        due: dueHabits.length,
        completed: dueHabits.filter((habit) => habit.todayStatus === 'COMPLETED').length,
      },
      tasks: { items: tasks.slice(0, 8), total: tasks.length },
      learning: { minutes: daily.studyMinutes, goalMinutes: settings?.dailyStudyGoalMin ?? 60 },
      workout: workoutToday,
      score: daily.score,
      unreadNotifications: unread.count,
    };
  }

  /** Longer-range widgets: weekly productivity, finance, projects, fitness. */
  async summary(userId: string) {
    const [weekly, finance, projects, fitness] = await Promise.all([
      this.analytics.weekly(userId),
      this.finance.summary(userId),
      this.projects.list(userId),
      this.analytics.fitnessAnalytics(userId),
    ]);
    return {
      weekly,
      finance: {
        month: finance.month,
        currency: finance.currency,
        income: finance.income,
        expenses: finance.expenses,
        savings: finance.savings,
        savingsRate: finance.savingsRate,
        totalBalance: finance.totalBalance,
      },
      projects: projects
        .filter((project) => project.status === 'ACTIVE' || project.status === 'PLANNING')
        .slice(0, 4)
        .map(({ id, name, progress, deadline, status, taskCount, completedTaskCount }) => ({
          id,
          name,
          progress,
          deadline,
          status,
          taskCount,
          completedTaskCount,
        })),
      fitness: {
        latestWeight: fitness.weight.latest,
        weightChange: fitness.weight.change,
        unit: fitness.weight.unit,
        workoutsThisWeek: fitness.workoutsThisWeek,
      },
    };
  }
}
