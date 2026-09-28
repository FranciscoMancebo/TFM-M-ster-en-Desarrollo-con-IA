import { describe, expect, it } from 'vitest';
import {
  calendarDate,
  calendarDateKey,
  calendarDays,
  calendarRange,
  shiftCalendarAnchor,
  startOfCalendarWeek,
} from '@/lib/workout/calendar';

describe('training calendar date helpers', () => {
  it('starts weeks on Monday', () => {
    expect(calendarDateKey(startOfCalendarWeek(calendarDate('2026-09-27')))).toBe('2026-09-21');
    expect(calendarDateKey(startOfCalendarWeek(calendarDate('2026-09-28')))).toBe('2026-09-28');
  });

  it('builds a complete seven-day week', () => {
    const days = calendarDays(calendarDate('2026-09-24'), 'week');
    expect(days).toHaveLength(7);
    expect(calendarDateKey(days[0])).toBe('2026-09-21');
    expect(calendarDateKey(days[6])).toBe('2026-09-27');
  });

  it('builds a stable six-row monthly grid', () => {
    const days = calendarDays(calendarDate('2026-09-15'), 'month');
    expect(days).toHaveLength(42);
    expect(calendarDateKey(days[0])).toBe('2026-08-31');
    expect(calendarDateKey(days[41])).toBe('2026-10-11');
  });

  it('moves anchors and reports the visible range', () => {
    expect(calendarDateKey(shiftCalendarAnchor(calendarDate('2026-09-28'), 'week', 1))).toBe('2026-10-05');
    expect(calendarDateKey(shiftCalendarAnchor(calendarDate('2026-09-28'), 'month', -1))).toBe('2026-08-01');
    expect(calendarRange(calendarDate('2026-09-15'), 'month')).toEqual({
      from: '2026-08-31',
      to: '2026-10-11',
    });
  });
});
