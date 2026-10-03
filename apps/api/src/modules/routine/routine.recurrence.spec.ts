import { occursOn, RECURRENCE_PATTERN } from './routine.recurrence.js';

describe('routine recurrence', () => {
  // 2026-10-02 Fri, 2026-10-03 Sat, 2026-10-05 Mon
  it('handles daily, weekday, weekend and weekly rules', () => {
    expect(occursOn(null, '2026-10-03')).toBe(true);
    expect(occursOn('WEEKDAYS', '2026-10-02')).toBe(true);
    expect(occursOn('WEEKDAYS', '2026-10-03')).toBe(false);
    expect(occursOn('WEEKENDS', '2026-10-03')).toBe(true);
    expect(occursOn('WEEKLY:MO,WE', '2026-10-05')).toBe(true);
    expect(occursOn('WEEKLY:MO,WE', '2026-10-02')).toBe(false);
  });

  it('validates rule syntax', () => {
    expect(RECURRENCE_PATTERN.test('WEEKLY:MO,FR')).toBe(true);
    expect(RECURRENCE_PATTERN.test('WEEKLY:')).toBe(false);
    expect(RECURRENCE_PATTERN.test('MONTHLY')).toBe(false);
  });
});
