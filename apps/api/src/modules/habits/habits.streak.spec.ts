import { calculateStreak, completionRate } from './habits.streak.js';

// 2026-10-02 is a Friday.
const today = '2026-10-02';

describe('habit streaks', () => {
  it('counts consecutive completed days for daily habits', () => {
    const result = calculateStreak({ frequency: 'DAILY', completedDates: ['2026-09-30', '2026-10-01', '2026-10-02'], today });
    expect(result.current).toBe(3);
    expect(result.completedCurrentPeriod).toBe(true);
  });

  it('does not break the streak because today is not done yet', () => {
    const result = calculateStreak({ frequency: 'DAILY', completedDates: ['2026-09-30', '2026-10-01'], today });
    expect(result.current).toBe(2);
    expect(result.completedCurrentPeriod).toBe(false);
  });

  it('breaks on a missed day', () => {
    const result = calculateStreak({ frequency: 'DAILY', completedDates: ['2026-09-28', '2026-09-29', '2026-10-01'], today });
    expect(result.current).toBe(1);
    expect(result.best).toBe(2);
  });

  it('skips weekends for weekday habits instead of breaking', () => {
    // Fri 25, (Sat 26, Sun 27 skipped), Mon 28 … Fri Oct 2
    const completed = ['2026-09-25', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
    expect(calculateStreak({ frequency: 'WEEKDAYS', completedDates: completed, today }).current).toBe(6);
    // A daily habit with the same history is broken by the weekend.
    expect(calculateStreak({ frequency: 'DAILY', completedDates: completed, today }).current).toBe(5);
  });

  it('counts weeks meeting the target for weekly habits', () => {
    const completed = [
      '2026-09-15', '2026-09-17', '2026-09-19', // week of Sep 14: 3
      '2026-09-22', '2026-09-24', '2026-09-26', // week of Sep 21: 3
      '2026-09-29',                              // current week: 1 so far
    ];
    const result = calculateStreak({ frequency: 'WEEKLY', weeklyTarget: 3, completedDates: completed, today });
    expect(result.unit).toBe('week');
    expect(result.current).toBe(2); // unfinished current week does not break it
    expect(result.completedCurrentPeriod).toBe(false);
  });

  it('computes completion rate over scheduled days only', () => {
    const input = { frequency: 'WEEKDAYS' as const, completedDates: ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'], today };
    expect(completionRate(input, 7)).toBe(100);
    expect(completionRate({ ...input, frequency: 'DAILY' }, 7)).toBe(71);
  });

  it('bounds completion rate by the habit creation date', () => {
    expect(completionRate({ frequency: 'DAILY', completedDates: ['2026-10-01', '2026-10-02'], today, createdOn: '2026-10-01' }, 30)).toBe(100);
  });

  it('includes history logged before the habit was created', () => {
    // Weekday habit created on a Saturday, with the past two weeks of weekdays backfilled.
    const completed = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
    expect(completionRate({ frequency: 'WEEKDAYS', completedDates: completed, today: '2026-10-03', createdOn: '2026-10-03' }, 30)).toBe(100);
  });
});
