import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEvents } from '../../common/events/domain-events.js';
import { UserClock } from '../../common/user-clock.service.js';
import { localDayRangeUtc } from '../../common/utils/date.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { HabitsService } from '../habits/habits.service.js';
import { NotificationsService } from './notifications.service.js';

const STREAK_MILESTONES = new Set([7, 21, 30, 50, 100, 200, 365]);

/** Turns domain events into achievement notifications (spec §29, §57). */
@Injectable()
export class NotificationListeners implements OnModuleInit {
  constructor(
    private readonly events: DomainEvents,
    private readonly notifications: NotificationsService,
    private readonly habits: HabitsService,
    private readonly prisma: PrismaService,
    private readonly clock: UserClock,
  ) {}

  onModuleInit() {
    this.events.subscribe('HABIT_COMPLETED', async (event) => {
      const { streak } = await this.habits.stats(event.habitId, event.userId);
      if (!STREAK_MILESTONES.has(streak.current)) return;
      await this.notifications.notify(event.userId, {
        type: 'ACHIEVEMENT',
        title: `${streak.current}-${streak.unit} streak`,
        message: `You've kept "${event.habitName}" going for ${streak.current} ${streak.unit}s in a row.`,
        dedupeKey: `achievement:habit:${event.habitId}:${streak.current}`,
        metadata: { habitId: event.habitId },
      });
    });

    this.events.subscribe('PROJECT_COMPLETED', (event) =>
      this.notifications.notify(event.userId, {
        type: 'ACHIEVEMENT',
        title: 'Project completed',
        message: `"${event.projectName}" is done.`,
        dedupeKey: `achievement:project:${event.projectId}`,
        metadata: { projectId: event.projectId },
      }),
    );

    this.events.subscribe('SAVINGS_MILESTONE', (event) =>
      this.notifications.notify(event.userId, {
        type: 'SAVINGS_MILESTONE',
        title: event.percent >= 100 ? 'Savings goal reached' : `${event.percent}% of a savings goal`,
        message: `"${event.goalName}" is ${event.percent >= 100 ? 'fully funded' : `${event.percent}% funded`}.`,
        dedupeKey: `savings:${event.goalId}:${event.percent}`,
        metadata: { goalId: event.goalId },
      }),
    );

    this.events.subscribe('LEARNING_SESSION_COMPLETED', async (event) => {
      const { today, timezone } = await this.clock.today(event.userId);
      const range = localDayRangeUtc(today, timezone);
      const [settings, total] = await Promise.all([
        this.prisma.userSettings.findUnique({ where: { userId: event.userId } }),
        this.prisma.learningSession.aggregate({
          where: { userId: event.userId, startedAt: { gte: range.start, lt: range.end } },
          _sum: { durationMinutes: true },
        }),
      ]);
      const goal = settings?.dailyStudyGoalMin ?? 0;
      const minutes = total._sum.durationMinutes ?? 0;
      if (goal > 0 && minutes >= goal && minutes - event.minutes < goal) {
        await this.notifications.notify(event.userId, {
          type: 'ACHIEVEMENT',
          title: 'Daily study goal reached',
          message: `${minutes} minutes of focused learning today.`,
          dedupeKey: `achievement:study:${today}`,
        });
      }
    });
  }
}
