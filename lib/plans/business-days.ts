/** Business-day (Mon–Fri) helpers for plan calendar. */

const MS_PER_DAY = 86_400_000;

export function isWeekend(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Add N business days from start (inclusive of start when offset is 0). */
export function bizToDate(startDate: string, bizOffset: number): string {
  if (bizOffset <= 0) return startDate;

  let count = 0;
  let date = new Date(`${startDate}T12:00:00`);

  while (count < bizOffset) {
    date = new Date(date.getTime() + MS_PER_DAY);
    if (!isWeekend(date)) count += 1;
  }

  return date.toISOString().slice(0, 10);
}

/** Business days between start (exclusive) and target (inclusive). */
export function businessDaysBetween(startDate: string, targetDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const target = new Date(`${targetDate}T12:00:00`);
  if (target <= start) return 0;

  let count = 0;
  let cursor = new Date(start.getTime() + MS_PER_DAY);

  while (cursor <= target) {
    if (!isWeekend(cursor)) count += 1;
    cursor = new Date(cursor.getTime() + MS_PER_DAY);
  }

  return count;
}

export function calendarDaysBetween(startDate: string, targetDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const target = new Date(`${targetDate}T12:00:00`);
  return Math.round((target.getTime() - start.getTime()) / MS_PER_DAY);
}

export function offsetToX(startDate: string, bizOffset: number, dayWidth: number): number {
  const date = bizToDate(startDate, bizOffset);
  return calendarDaysBetween(startDate, date) * dayWidth;
}

export function shiftBizOffsetByCalendarDrag(origOffset: number, calDayDelta: number): number {
  const bizDelta = Math.round((calDayDelta * 5) / 7);
  return Math.max(1, origOffset + bizDelta);
}

export function nextMondayBizDelta(stepDateIso: string): number {
  const stepDate = new Date(`${stepDateIso}T12:00:00`);
  const dow = stepDate.getDay();
  const calDaysToMon = dow === 1 ? 7 : (8 - dow) % 7 || 7;
  const bizDaysToMon = calDaysToMon - (calDaysToMon > 5 ? 2 : 0);
  return Math.max(1, bizDaysToMon);
}

export type DayHeader = {
  iso: string;
  day: number;
  dow: string;
  monthName: string;
  isWeekend: boolean;
  isToday: boolean;
  isMonthStart: boolean;
};

export function buildDayHeaders(startDate: string, totalCalendarDays: number): DayHeader[] {
  const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date().toISOString().slice(0, 10);
  const headers: DayHeader[] = [];

  for (let i = 0; i < totalCalendarDays; i += 1) {
    const iso = addCalendarDays(startDate, i);
    const date = new Date(`${iso}T12:00:00`);
    headers.push({
      iso,
      day: date.getDate(),
      dow: dowLabels[date.getDay()] ?? "",
      monthName: monthLabels[date.getMonth()] ?? "",
      isWeekend: isWeekend(date),
      isToday: iso === today,
      isMonthStart: date.getDate() === 1,
    });
  }

  return headers;
}
