import type { NotificationPriority } from '@prisma/client';

/** Notification types users can toggle (spec §29). "ALL" disables a channel entirely. */
export const NOTIFICATION_TYPES = [
  'HABIT_REMINDER',
  'TASK_DUE_SOON',
  'TASK_OVERDUE',
  'PROJECT_DEADLINE',
  'DAILY_REVIEW',
  'WEEKLY_REVIEW',
  'ACHIEVEMENT',
  'SAVINGS_MILESTONE',
  'REMINDER',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotifyInput {
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  /** Deliver at this time; defaults to now. */
  scheduledAt?: Date;
  /** Same key ⇒ the notification is created at most once per user. */
  dedupeKey?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
