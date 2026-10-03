/**
 * Timezone-aware date helpers (spec §34).
 *
 * Conventions:
 * - A "date key" is a local calendar date string "YYYY-MM-DD" in the user's timezone.
 * - DATE columns (habit/routine logs) store the date key as midnight UTC.
 * - Instants (startedAt, expenseDate, …) are stored in UTC; local-day boundaries
 *   are computed with `localDayRangeUtc`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function zonedParts(date: Date, timeZone: string) {
  const parts: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return parts as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const date = new Date(`${key}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key;
}

/** Local calendar date of an instant in a timezone. */
export function localDateKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Local wall-clock time "HH:mm" of an instant in a timezone. */
export function localTimeHHmm(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** Date key → Date at midnight UTC (the value stored in DATE columns). */
export function dateKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Date (as read from a DATE column) → date key. */
export function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  return dateToKey(new Date(dateKeyToDate(key).getTime() + days * DAY_MS));
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(key: string): number {
  return dateKeyToDate(key).getUTCDay();
}

/** ISO week start (Monday) for a date key. */
export function startOfWeek(key: string): string {
  const weekday = weekdayOf(key);
  return addDays(key, -((weekday + 6) % 7));
}

export function startOfMonth(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((dateKeyToDate(toKey).getTime() - dateKeyToDate(fromKey).getTime()) / DAY_MS);
}

/** Offset (ms) of a timezone from UTC at a given instant. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (date.getTime() - date.getUTCMilliseconds());
}

/** The UTC instant at which a local date begins in a timezone (DST-safe). */
export function localMidnightUtc(key: string, timeZone: string): Date {
  const guess = dateKeyToDate(key).getTime();
  const firstOffset = timeZoneOffsetMs(new Date(guess), timeZone);
  let instant = guess - firstOffset;
  const secondOffset = timeZoneOffsetMs(new Date(instant), timeZone);
  if (secondOffset !== firstOffset) instant = guess - secondOffset;
  return new Date(instant);
}

/** [start, end) UTC instants covering local dates fromKey..toKey inclusive. */
export function localRangeUtc(fromKey: string, toKey: string, timeZone: string) {
  return {
    start: localMidnightUtc(fromKey, timeZone),
    end: localMidnightUtc(addDays(toKey, 1), timeZone),
  };
}

export function localDayRangeUtc(key: string, timeZone: string) {
  return localRangeUtc(key, key, timeZone);
}

/** Inclusive list of date keys. */
export function dateKeysBetween(fromKey: string, toKey: string): string[] {
  const keys: string[] = [];
  for (let key = fromKey; key <= toKey; key = addDays(key, 1)) keys.push(key);
  return keys;
}

export function isValidTimeOfDay(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** True if `time` falls in the [start, end) window, handling windows that wrap midnight. */
export function isWithinTimeWindow(time: string, start: string, end: string): boolean {
  if (start === end) return false;
  return start < end ? time >= start && time < end : time >= start || time < end;
}
