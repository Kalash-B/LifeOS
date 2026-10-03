import {
  addDays,
  isValidDateKey,
  isWithinTimeWindow,
  localDateKey,
  localMidnightUtc,
  localTimeHHmm,
  startOfWeek,
} from './date.util.js';

describe('date.util', () => {
  it('derives the local calendar date in the user timezone', () => {
    // 20:00 UTC on Oct 2 is already Oct 3 in India (UTC+5:30)
    const instant = new Date('2026-10-02T20:00:00Z');
    expect(localDateKey(instant, 'UTC')).toBe('2026-10-02');
    expect(localDateKey(instant, 'Asia/Kolkata')).toBe('2026-10-03');
    expect(localDateKey(instant, 'America/Los_Angeles')).toBe('2026-10-02');
    expect(localTimeHHmm(instant, 'Asia/Kolkata')).toBe('01:30');
  });

  it('computes local midnight as a UTC instant, including across DST', () => {
    expect(localMidnightUtc('2026-10-03', 'Asia/Kolkata').toISOString()).toBe('2026-10-02T18:30:00.000Z');
    // New York: EDT (UTC-4) in summer, EST (UTC-5) in winter
    expect(localMidnightUtc('2026-07-01', 'America/New_York').toISOString()).toBe('2026-07-01T04:00:00.000Z');
    expect(localMidnightUtc('2026-12-01', 'America/New_York').toISOString()).toBe('2026-12-01T05:00:00.000Z');
    // DST switch day itself (2026-03-08 in the US)
    expect(localMidnightUtc('2026-03-08', 'America/New_York').toISOString()).toBe('2026-03-08T05:00:00.000Z');
  });

  it('does calendar arithmetic on date keys', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28'); // Sunday → previous Monday
    expect(startOfWeek('2026-09-28')).toBe('2026-09-28');
  });

  it('validates date keys strictly', () => {
    expect(isValidDateKey('2026-02-29')).toBe(false);
    expect(isValidDateKey('2028-02-29')).toBe(true);
    expect(isValidDateKey('2026-1-1')).toBe(false);
  });

  it('handles quiet-hour windows that wrap midnight', () => {
    expect(isWithinTimeWindow('23:30', '22:00', '07:00')).toBe(true);
    expect(isWithinTimeWindow('06:59', '22:00', '07:00')).toBe(true);
    expect(isWithinTimeWindow('07:00', '22:00', '07:00')).toBe(false);
    expect(isWithinTimeWindow('13:00', '12:00', '14:00')).toBe(true);
  });
});
