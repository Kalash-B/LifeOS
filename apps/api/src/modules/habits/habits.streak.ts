import { addDays, dateKeysBetween, startOfWeek, weekdayOf } from '../../common/utils/date.util.js';

export type Frequency = 'DAILY' | 'WEEKDAYS' | 'WEEKLY';

export interface StreakInput {
  frequency: Frequency;
  /** WEEKLY: completions required per week (default 1). Ignored otherwise. */
  weeklyTarget?: number | null;
  /** Local date keys on which the habit was completed. */
  completedDates: Iterable<string>;
  /** Local date key for "today" in the user's timezone. */
  today: string;
  /** First date the habit existed; bounds completion-rate windows. */
  createdOn?: string;
}

export interface StreakResult {
  /** Consecutive scheduled periods completed (days for DAILY/WEEKDAYS, weeks for WEEKLY). */
  current: number;
  best: number;
  unit: 'day' | 'week';
  /** Whether today's (or this week's) requirement is already met. */
  completedCurrentPeriod: boolean;
}

/** Is the habit scheduled on this date? (WEEKLY habits may be done any day.) */
export function isScheduled(frequency: Frequency, key: string): boolean {
  if (frequency === 'WEEKDAYS') {
    const weekday = weekdayOf(key);
    return weekday >= 1 && weekday <= 5;
  }
  return true;
}

/**
 * Schedule-aware streak (spec §56).
 * - An unfinished *current* period never breaks the streak — the user still has time.
 * - Unscheduled days (weekends for WEEKDAYS habits) are skipped, not counted as misses.
 */
export function calculateStreak(input: StreakInput): StreakResult {
  const completed = new Set(input.completedDates);
  if (input.frequency === 'WEEKLY') return weeklyStreak(completed, input);

  const scheduledDays = (from: string, to: string) =>
    dateKeysBetween(from, to).filter((key) => isScheduled(input.frequency, key));

  // Current streak: walk backwards from today.
  const completedToday = completed.has(input.today);
  let current = 0;
  let cursor = completedToday ? input.today : addDays(input.today, -1);
  for (let guard = 0; guard < 3660; guard++) {
    if (!isScheduled(input.frequency, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!completed.has(cursor)) break;
    current++;
    cursor = addDays(cursor, -1);
  }

  // Best streak: forward pass over scheduled days since the first completion.
  const sorted = [...completed].sort();
  let best = 0;
  if (sorted.length) {
    let run = 0;
    for (const key of scheduledDays(sorted[0], input.today)) {
      if (completed.has(key)) {
        run++;
        best = Math.max(best, run);
      } else if (key !== input.today) {
        run = 0;
      }
    }
  }

  return {
    current,
    best: Math.max(best, current),
    unit: 'day',
    completedCurrentPeriod: completedToday || !isScheduled(input.frequency, input.today),
  };
}

function weeklyStreak(completed: Set<string>, input: StreakInput): StreakResult {
  const target = Math.max(1, Math.round(input.weeklyTarget ?? 1));
  const perWeek = new Map<string, number>();
  for (const key of completed) {
    const week = startOfWeek(key);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  const met = (week: string) => (perWeek.get(week) ?? 0) >= target;

  const thisWeek = startOfWeek(input.today);
  const metThisWeek = met(thisWeek);
  let current = 0;
  let cursor = metThisWeek ? thisWeek : addDays(thisWeek, -7);
  for (let guard = 0; guard < 520 && met(cursor); guard++) {
    current++;
    cursor = addDays(cursor, -7);
  }

  let best = 0;
  const weeks = [...perWeek.keys()].sort();
  if (weeks.length) {
    let run = 0;
    for (let week = weeks[0]; week <= thisWeek; week = addDays(week, 7)) {
      if (met(week)) {
        run++;
        best = Math.max(best, run);
      } else if (week !== thisWeek) {
        run = 0;
      }
    }
  }

  return { current, best: Math.max(best, current), unit: 'week', completedCurrentPeriod: metThisWeek };
}

/** Completion rate (0–100) over the last `days` days, counting only scheduled days. */
export function completionRate(input: StreakInput, days: number): number {
  const completed = new Set(input.completedDates);
  let from = addDays(input.today, -(days - 1));
  // Don't count days before the habit existed — unless the user logged history from before then.
  const firstCompletion = [...completed].sort()[0];
  const start = input.createdOn && firstCompletion && firstCompletion < input.createdOn ? firstCompletion : input.createdOn;
  if (start && start > from) from = start;
  if (from > input.today) return 0;

  if (input.frequency === 'WEEKLY') {
    const target = Math.max(1, Math.round(input.weeklyTarget ?? 1));
    const window = dateKeysBetween(from, input.today);
    const expected = Math.max(1, Math.round((window.length / 7) * target));
    const done = window.filter((key) => completed.has(key)).length;
    return Math.min(100, Math.round((done / expected) * 100));
  }

  const scheduled = dateKeysBetween(from, input.today).filter((key) => isScheduled(input.frequency, key));
  if (!scheduled.length) return 0;
  const done = scheduled.filter((key) => completed.has(key)).length;
  return Math.round((done / scheduled.length) * 100);
}
