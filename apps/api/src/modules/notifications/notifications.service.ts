import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, type NotificationPriority } from '@prisma/client';
import { paginated } from '../../common/interceptors/response.interceptor.js';
import { isWithinTimeWindow, localTimeHHmm } from '../../common/utils/date.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateReminderDto, NotificationQueryDto, UpdatePreferencesDto } from './notifications.dto.js';
import { NOTIFICATION_TYPES, type NotifyInput } from './notifications.types.js';

/** Statuses visible in the in-app inbox (PENDING ones are not delivered yet). */
const DELIVERED = ['SENT', 'READ'] as const;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('notifications');

  constructor(private readonly prisma: PrismaService) {}

  // ─── Inbox ────────────────────────────────────────────────────────────────

  async list(userId: string, query: NotificationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.NotificationWhereInput = {
      userId,
      status: query.status ?? (query.unread ? 'SENT' : { in: [...DELIVERED] }),
    };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { sentAt: { sort: 'desc', nulls: 'last' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginated(items, page, limit, total);
  }

  async unreadCount(userId: string) {
    return { count: await this.prisma.notification.count({ where: { userId, status: 'SENT' } }) };
  }

  /** Upcoming reminders the user scheduled or that are held by quiet hours. */
  scheduled(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, status: 'PENDING' },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });
  }

  async markRead(id: string, userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, status: { in: ['SENT', 'READ'] } },
      data: { status: 'READ', readAt: new Date() },
    });
    if (!count) throw new NotFoundException('Notification not found.');
    return { read: true };
  }

  async markAllRead(userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, status: 'SENT' },
      data: { status: 'READ', readAt: new Date() },
    });
    return { updated: count };
  }

  /** Dismisses a delivered notification or cancels a pending one. */
  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found.');
    if (notification.status === 'PENDING') {
      await this.prisma.notification.update({ where: { id }, data: { status: 'CANCELLED' } });
    } else {
      await this.prisma.notification.delete({ where: { id } });
    }
    return { deleted: true };
  }

  async createReminder(dto: CreateReminderDto, userId: string) {
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt.getTime() < Date.now() - 60_000) throw new BadRequestException('scheduledAt must be in the future.');
    return this.notify(userId, {
      type: 'REMINDER',
      title: dto.title,
      message: dto.message ?? '',
      priority: dto.priority ?? 'IMPORTANT',
      scheduledAt,
    });
  }

  // ─── Preferences ──────────────────────────────────────────────────────────

  async preferences(userId: string) {
    const stored = await this.prisma.notificationPreference.findMany({ where: { userId } });
    const enabled = (category: string) =>
      stored.find((pref) => pref.channel === 'IN_APP' && pref.category === category)?.enabled ?? true;
    return {
      channels: [
        { channel: 'IN_APP', available: true, enabled: enabled('ALL') },
        // Push and email delivery need provider credentials (VAPID / SMTP) and are not wired in V1.
        { channel: 'PUSH', available: false, enabled: false },
        { channel: 'EMAIL', available: false, enabled: false },
      ],
      categories: NOTIFICATION_TYPES.map((category) => ({ category, enabled: enabled(category) })),
    };
  }

  async updatePreferences(dto: UpdatePreferencesDto, userId: string) {
    await this.prisma.$transaction(
      dto.preferences.map((pref) =>
        this.prisma.notificationPreference.upsert({
          where: { userId_channel_category: { userId, channel: pref.channel, category: pref.category } },
          update: { enabled: pref.enabled },
          create: { userId, channel: pref.channel, category: pref.category, enabled: pref.enabled },
        }),
      ),
    );
    return this.preferences(userId);
  }

  // ─── Creation & delivery ──────────────────────────────────────────────────

  /**
   * Single entry point for every module/job that wants to notify a user.
   * Respects preferences, de-duplicates, and delivers immediately unless the
   * notification is scheduled for later or quiet hours apply.
   */
  async notify(userId: string, input: NotifyInput) {
    const disabled = await this.prisma.notificationPreference.findFirst({
      where: { userId, channel: 'IN_APP', category: { in: [input.type, 'ALL'] }, enabled: false },
    });
    if (disabled && input.type !== 'REMINDER') return null;

    const now = new Date();
    const scheduledAt = input.scheduledAt ?? now;
    const deliverNow = scheduledAt <= now && !(await this.inQuietHours(userId, input.priority ?? 'USEFUL', now));

    try {
      return await this.prisma.notification.create({
        data: {
          userId,
          type: input.type,
          title: input.title,
          message: input.message,
          priority: input.priority ?? 'USEFUL',
          scheduledAt,
          dedupeKey: input.dedupeKey,
          metadata: input.metadata,
          status: deliverNow ? 'SENT' : 'PENDING',
          sentAt: deliverNow ? now : null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null;
      throw error;
    }
  }

  /** Delivers due PENDING notifications (called by the background worker). */
  async dispatchDue(now = new Date()) {
    const due = await this.prisma.notification.findMany({
      where: { status: 'PENDING', scheduledAt: { lte: now } },
      take: 500,
      orderBy: { scheduledAt: 'asc' },
    });
    let delivered = 0;
    for (const notification of due) {
      if (await this.inQuietHours(notification.userId, notification.priority, now)) continue;
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'SENT', sentAt: now },
      });
      delivered++;
    }
    if (delivered) this.logger.log({ operation: 'dispatch', delivered });
    return delivered;
  }

  /** Spec §49: non-critical notifications wait until quiet hours end. */
  private async inQuietHours(userId: string, priority: NotificationPriority, now: Date) {
    if (priority === 'CRITICAL') return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true, settings: { select: { quietHoursStart: true, quietHoursEnd: true } } },
    });
    const start = user?.settings?.quietHoursStart;
    const end = user?.settings?.quietHoursEnd;
    if (!user || !start || !end) return false;
    return isWithinTimeWindow(localTimeHHmm(now, user.timezone), start, end);
  }
}
