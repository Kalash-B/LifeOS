import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DomainEvents } from '../../common/events/domain-events.js';
import { UserClock } from '../../common/user-clock.service.js';
import { addDays, dateKeysBetween, localDateKey, localMidnightUtc } from '../../common/utils/date.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateLearningGoalDto,
  CreateLearningSessionDto,
  CreateLearningTopicDto,
  UpdateLearningGoalDto,
  UpdateLearningTopicDto,
} from './learning.dto.js';

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: UserClock,
    private readonly events: DomainEvents,
  ) {}

  // ─── Goals ────────────────────────────────────────────────────────────────

  async goals(userId: string) {
    const [goals, minutes] = await Promise.all([
      this.prisma.learningGoal.findMany({
        where: { userId },
        include: { topics: { orderBy: { position: 'asc' } } },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.learningSession.groupBy({
        by: ['learningGoalId'],
        where: { userId },
        _sum: { durationMinutes: true },
        _count: true,
      }),
    ]);
    return goals.map((goal) => {
      const totals = minutes.find((entry) => entry.learningGoalId === goal.id);
      return { ...goal, totalMinutes: totals?._sum.durationMinutes ?? 0, sessionCount: totals?._count ?? 0 };
    });
  }

  async goal(id: string, userId: string) {
    const goal = await this.prisma.learningGoal.findFirst({
      where: { id, userId },
      include: {
        topics: { orderBy: { position: 'asc' } },
        sessions: { orderBy: { startedAt: 'desc' }, take: 50, include: { learningTopic: { select: { id: true, name: true } } } },
      },
    });
    if (!goal) throw new NotFoundException('Learning goal not found.');
    return goal;
  }

  createGoal(dto: CreateLearningGoalDto, userId: string) {
    return this.prisma.learningGoal.create({
      data: { ...dto, targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined, userId },
      include: { topics: true },
    });
  }

  async updateGoal(id: string, dto: UpdateLearningGoalDto, userId: string) {
    await this.assertGoal(id, userId);
    return this.prisma.learningGoal.update({
      where: { id },
      data: { ...dto, targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined },
    });
  }

  async deleteGoal(id: string, userId: string) {
    await this.assertGoal(id, userId);
    await this.prisma.learningGoal.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Topics ───────────────────────────────────────────────────────────────

  async createTopic(goalId: string, dto: CreateLearningTopicDto, userId: string) {
    await this.assertGoal(goalId, userId);
    const position = dto.position ?? (await this.prisma.learningTopic.count({ where: { learningGoalId: goalId } }));
    const topic = await this.prisma.learningTopic.create({ data: { ...dto, position, learningGoalId: goalId } });
    await this.syncGoalProgress(goalId);
    return topic;
  }

  async updateTopic(id: string, dto: UpdateLearningTopicDto, userId: string) {
    const topic = await this.assertTopic(id, userId);
    const progress = dto.status === 'COMPLETED' && dto.progress === undefined ? 100 : dto.progress;
    const updated = await this.prisma.learningTopic.update({ where: { id }, data: { ...dto, progress } });
    await this.syncGoalProgress(topic.learningGoalId);
    return updated;
  }

  async deleteTopic(id: string, userId: string) {
    const topic = await this.assertTopic(id, userId);
    await this.prisma.learningTopic.delete({ where: { id } });
    await this.syncGoalProgress(topic.learningGoalId);
    return { deleted: true };
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  sessions(userId: string, days = 30, goalId?: string) {
    return this.prisma.learningSession.findMany({
      where: { userId, learningGoalId: goalId, startedAt: { gte: new Date(Date.now() - days * 86_400_000) } },
      include: {
        learningGoal: { select: { id: true, name: true, category: true } },
        learningTopic: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async createSession(dto: CreateLearningSessionDto, userId: string) {
    await this.assertGoal(dto.learningGoalId, userId);
    if (dto.learningTopicId) {
      const topic = await this.prisma.learningTopic.findFirst({
        where: { id: dto.learningTopicId, learningGoalId: dto.learningGoalId },
      });
      if (!topic) throw new BadRequestException('Topic does not belong to this goal.');
    }
    const startedAt = new Date(dto.startedAt);
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : null;
    if (endedAt && endedAt < startedAt) throw new BadRequestException('endedAt must be after startedAt.');
    const durationMinutes =
      dto.durationMinutes ?? (endedAt ? Math.round((endedAt.getTime() - startedAt.getTime()) / 60000) : null);
    if (!durationMinutes || durationMinutes < 1) {
      throw new BadRequestException('Provide durationMinutes or an endedAt at least one minute after startedAt.');
    }

    const session = await this.prisma.learningSession.create({
      data: {
        userId,
        learningGoalId: dto.learningGoalId,
        learningTopicId: dto.learningTopicId,
        startedAt,
        endedAt: endedAt ?? new Date(startedAt.getTime() + durationMinutes * 60000),
        durationMinutes,
        productivityRating: dto.productivityRating,
        notes: dto.notes,
      },
      include: { learningGoal: { select: { id: true, name: true, category: true } } },
    });
    this.events.publish({ type: 'LEARNING_SESSION_COMPLETED', userId, sessionId: session.id, minutes: durationMinutes });
    return session;
  }

  async deleteSession(id: string, userId: string) {
    const { count } = await this.prisma.learningSession.deleteMany({ where: { id, userId } });
    if (!count) throw new NotFoundException('Session not found.');
    return { deleted: true };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async stats(userId: string, days = 14) {
    const { today, timezone } = await this.clock.today(userId);
    const from = addDays(today, -(days - 1));
    const [sessions, settings, goals] = await Promise.all([
      this.prisma.learningSession.findMany({
        where: { userId, startedAt: { gte: localMidnightUtc(addDays(today, -364), timezone) } },
        select: { startedAt: true, durationMinutes: true, productivityRating: true, learningGoalId: true },
      }),
      this.prisma.userSettings.findUnique({ where: { userId } }),
      this.prisma.learningGoal.findMany({ where: { userId }, select: { id: true, name: true } }),
    ]);

    const minutesByDay = new Map<string, number>();
    for (const session of sessions) {
      const key = localDateKey(session.startedAt, timezone);
      minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + (session.durationMinutes ?? 0));
    }

    let streak = 0;
    for (let cursor = minutesByDay.has(today) ? today : addDays(today, -1); minutesByDay.has(cursor); cursor = addDays(cursor, -1)) {
      streak++;
    }

    const recent = sessions.filter((session) => localDateKey(session.startedAt, timezone) >= from);
    const ratings = recent.map((session) => session.productivityRating).filter((rating): rating is number => rating != null);
    const byGoal = goals
      .map((goal) => ({
        goalId: goal.id,
        name: goal.name,
        minutes: recent.filter((s) => s.learningGoalId === goal.id).reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0),
      }))
      .filter((entry) => entry.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);

    return {
      today: minutesByDay.get(today) ?? 0,
      dailyGoalMinutes: settings?.dailyStudyGoalMin ?? 60,
      periodMinutes: recent.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0),
      periodDays: days,
      sessionCount: recent.length,
      averageProductivity: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
      studyStreakDays: streak,
      daily: dateKeysBetween(from, today).map((date) => ({ date, minutes: minutesByDay.get(date) ?? 0 })),
      byGoal,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertGoal(id: string, userId: string) {
    const goal = await this.prisma.learningGoal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Learning goal not found.');
    return goal;
  }

  private async assertTopic(id: string, userId: string) {
    const topic = await this.prisma.learningTopic.findFirst({ where: { id, learningGoal: { userId } } });
    if (!topic) throw new NotFoundException('Topic not found.');
    return topic;
  }

  /** A goal with topics tracks the average of its topics' progress. */
  private async syncGoalProgress(goalId: string) {
    const topics = await this.prisma.learningTopic.findMany({ where: { learningGoalId: goalId }, select: { progress: true } });
    if (!topics.length) return;
    const progress = Math.round(topics.reduce((sum, topic) => sum + topic.progress, 0) / topics.length);
    await this.prisma.learningGoal.update({ where: { id: goalId }, data: { progress } });
  }
}
