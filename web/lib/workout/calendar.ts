export type CalendarViewMode = 'week' | 'month';

function atNoon(value: Date | string) {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : new Date(value);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function calendarDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calendarDate(value: string) {
  return atNoon(value);
}

export function startOfCalendarWeek(value: Date) {
  const result = atNoon(value);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
}

export function calendarDays(anchor: Date, mode: CalendarViewMode) {
  const start = mode === 'week'
    ? startOfCalendarWeek(anchor)
    : startOfCalendarWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12));
  const length = mode === 'week' ? 7 : 42;
  return Array.from({ length }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function shiftCalendarAnchor(anchor: Date, mode: CalendarViewMode, direction: -1 | 1) {
  const result = atNoon(anchor);
  if (mode === 'week') result.setDate(result.getDate() + direction * 7);
  else result.setMonth(result.getMonth() + direction, 1);
  return result;
}

export function calendarRange(anchor: Date, mode: CalendarViewMode) {
  const days = calendarDays(anchor, mode);
  return {
    from: calendarDateKey(days[0]),
    to: calendarDateKey(days[days.length - 1]),
  };
}
