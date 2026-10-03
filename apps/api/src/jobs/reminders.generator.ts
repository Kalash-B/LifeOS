import { Injectable, Logger } from '@nestjs/common';
import { localDateKey, localTimeHHmm, startOfWeek, weekdayOf, dateKeyToDate } from '../common/utils/date.util.js';
import { AnalyticsService } from '../modules/analytics/analytics.service.js';
import { isScheduled } from '../modules/habits/habits.streak.js';
import { NotificationsService } from '../modules/notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DAILY_REVIEW_TIME = '21:00';
const WEEKLY_REVIEW_TIME = '18:00';
const HOUR = 3_600_000;

/**
 * Generates time-based reminders. Every notification carries a dedupeKey, so
 * running this every minute (or twice, or after downtime) is idempotent.
 */
@Injectable()
export class RemindersGenerator {
  private readonly logger = new Logger('jobs.reminders');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly analytics: AnalyticsService,
  ) {}

  async run(now = new Date()) {
    await Promise.all([this.taskReminders(now), this.projectDeadlines(now)]);
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, timezone: true, settings: { select: { dailySummary: true, weeklySummary: true } } },
    });
    for (const user of users) {
      try {
        await this.userReminders(user, now);
      } catch (error) {
        this.logger.error({ operation: 'userReminders', userId: user.id, error: String(error) });
      }
    }
    return this.notifications.dispatchDue(now);
  }

  private async userReminders(
    user: { id: string; timezone: string; settings: { dailySummary: boolean; weeklySummary: boolean } | null },
    now: Date,
  ) {
    const today = localDateKey(now, user.timezone);
    const time = localTimeHHmm(now, user.timezone);

    const habits = await this.prisma.habit.findMany({
      where: { userId: user.id, isActive: true, reminderTime: { not: null, lte: time } },
      include: { habitLogs: { where: { date: dateKeyToDate(today), status: 'COMPLETED' }, select: { id: true } } },
    });
    for (const habit of habits) {
      if (habit.habitLogs.length || !isScheduled(habit.frequencyType, today)) continue;
      await this.notifications.notify(user.id, {
        type: 'HABIT_REMINDER',
        title: `Time for ${habit.name}`,
        message: habit.targetValue && habit.unit ? `Target: ${habit.targetValue} ${habit.unit}` : 'Keep your streak going.',
        dedupeKey: `habit:${habit.id}:${today}`,
        metadata: { habitId: habit.id },
      });
    }

    if ((user.settings?.dailySummary ?? true) && time >= DAILY_REVIEW_TIME) {
      const daily = await this.analytics.daily(user.id, today);
      await this.notifications.notify(user.id, {
        type: 'DAILY_REVIEW',
        title: 'Daily review',
        message: `${daily.completedTasks}/${daily.plannedTasks} planned items done · ${daily.habitCompletionRate}% habits · ${daily.studyMinutes} min study${daily.workoutCompleted ? ' · workout ✓' : ''}. What went well today?`,
        priority: 'OPTIONAL',
        dedupeKey: `daily-review:${today}`,
      });
    }

    if ((user.settings?.weeklySummary ?? true) && weekdayOf(today) === 0 && time >= WEEKLY_REVIEW_TIME) {
      const weekly = await this.analytics.weekly(user.id);
      await this.notifications.notify(user.id, {
        type: 'WEEKLY_REVIEW',
        title: 'Weekly review',
        message: `${weekly.habitCompletionRate}% habits · ${weekly.studyHours} h learning · ${weekly.workoutCount} workouts · ${weekly.tasksCompleted} tasks completed.`,
        priority: 'USEFUL',
        dedupeKey: `weekly-review:${startOfWeek(today)}`,
      });
    }
  }

  private async taskReminders(now: Date) {
    const tasks = await this.prisma.task.findMany({
      where: {
        status: { not: 'COMPLETED' },
        dueDate: { gt: new Date(now.getTime() - 7 * 24 * HOUR), lte: new Date(now.getTime() + 24 * HOUR) },
        project: { status: { notIn: ['COMPLETED', 'ARCHIVED'] } },
      },
      select: { id: true, userId: true, title: true, dueDate: true, projectId: true },
    });
    for (const task of tasks) {
      const overdue = task.dueDate! <= now;
      await this.notifications.notify(task.userId, {
        type: overdue ? 'TASK_OVERDUE' : 'TASK_DUE_SOON',
        title: overdue ? 'Task overdue' : 'Task due soon',
        message: task.title,
        priority: 'IMPORTANT',
        dedupeKey: `${overdue ? 'task-overdue' : 'task-due'}:${task.id}:${task.dueDate!.toISOString()}`,
        metadata: { taskId: task.id, projectId: task.projectId },
      });
    }
  }

  private async projectDeadlines(now: Date) {
    const projects = await this.prisma.project.findMany({
      where: {
        status: { notIn: ['COMPLETED', 'ARCHIVED'] },
        deadline: { gt: now, lte: new Date(now.getTime() + 72 * HOUR) },
      },
      select: { id: true, userId: true, name: true, deadline: true, progress: true },
    });
    for (const project of projects) {
      await this.notifications.notify(project.userId, {
        type: 'PROJECT_DEADLINE',
        title: 'Project deadline approaching',
        message: `"${project.name}" is due soon and is ${project.progress}% complete.`,
        priority: 'IMPORTANT',
        dedupeKey: `project-deadline:${project.id}:${project.deadline!.toISOString()}`,
        metadata: { projectId: project.id },
      });
    }
  }
}
