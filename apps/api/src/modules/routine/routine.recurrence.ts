import { weekdayOf } from '../../common/utils/date.util.js';

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/** Accepts: DAILY | WEEKDAYS | WEEKENDS | WEEKLY:MO,WE,FR */
export const RECURRENCE_PATTERN = /^(DAILY|WEEKDAYS|WEEKENDS|WEEKLY:(SU|MO|TU|WE|TH|FR|SA)(,(SU|MO|TU|WE|TH|FR|SA))*)$/;

export function occursOn(rule: string | null | undefined, dateKey: string): boolean {
  const weekday = weekdayOf(dateKey);
  if (!rule || rule === 'DAILY') return true;
  if (rule === 'WEEKDAYS') return weekday >= 1 && weekday <= 5;
  if (rule === 'WEEKENDS') return weekday === 0 || weekday === 6;
  if (rule.startsWith('WEEKLY:')) return rule.slice(7).split(',').includes(DAY_CODES[weekday]);
  return true;
}
