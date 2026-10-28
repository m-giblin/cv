/**
 * Due dates are stored as calendar days ("2026-10-29"). `new Date("2026-10-29")` reads that as
 * midnight UTC, which is the previous evening in US time zones, so dates showed a day early and
 * work turned overdue the evening before it was due. These helpers keep a calendar day a calendar day.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A Date for display: a bare calendar day becomes local noon of that day; timestamps pass through. */
export function parseDateOnly(value: string): Date {
  return DATE_ONLY.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
}

/** Today's calendar day in local time, as "YYYY-MM-DD". */
export function localToday(now: number | Date = Date.now()): string {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** True once the whole due day has passed (due today is not overdue). */
export function isPastDue(dueDate: string, now: number | Date = Date.now()): boolean {
  return dueDate.slice(0, 10) < localToday(now);
}

function shift(iso: string, days: number) {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The nth (1-based) weekday (0 = Sunday) of a month, or the last one when n is -1. */
function nthWeekday(year: number, month: number, weekday: number, n: number) {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
    return new Date(Date.UTC(year, month, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7)).toISOString().slice(0, 10);
  }
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return shift(lastDay.toISOString(), -((lastDay.getUTCDay() - weekday + 7) % 7));
}

/** A fixed-date holiday on a weekend is observed on the Friday before or the Monday after. */
function observed(iso: string) {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return day === 6 ? shift(iso, -1) : day === 0 ? shift(iso, 1) : iso;
}

const holidayCache = new Map<number, Map<string, string>>();

/** US company holidays for a year: the federal holidays most firms observe, plus the day after Thanksgiving. */
function holidaysFor(year: number) {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const pad = (month: number, day: number) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const thanksgiving = nthWeekday(year, 10, 4, 4);
  const days = new Map<string, string>([
    [observed(pad(1, 1)), "New Year's Day"],
    [nthWeekday(year, 0, 1, 3), "Martin Luther King Jr. Day"],
    [nthWeekday(year, 1, 1, 3), "Presidents' Day"],
    [nthWeekday(year, 4, 1, -1), "Memorial Day"],
    [observed(pad(6, 19)), "Juneteenth"],
    [observed(pad(7, 4)), "Independence Day"],
    [nthWeekday(year, 8, 1, 1), "Labor Day"],
    [thanksgiving, "Thanksgiving"],
    [shift(thanksgiving, 1), "the day after Thanksgiving"],
    [observed(pad(12, 25)), "Christmas Day"],
  ]);
  holidayCache.set(year, days);
  return days;
}

/** The holiday a calendar day falls on, or null. */
export function holidayOn(iso: string): string | null {
  return holidaysFor(Number(iso.slice(0, 4))).get(iso.slice(0, 10)) ?? null;
}

function isWorkday(iso: string) {
  const day = new Date(`${iso.slice(0, 10)}T12:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6 && !holidayOn(iso);
}

/**
 * Moves a calendar day onto a workday: Saturday to the Friday before, Sunday to the Monday after,
 * and a holiday (or a Sunday before a Monday holiday) to the workday before it. Keeps a run of
 * dates in order, so steps due on consecutive days never swap.
 */
export function nearestWeekday(iso: string): string {
  const day = iso.slice(0, 10);
  if (isWorkday(day)) return day;
  if (new Date(`${day}T12:00:00Z`).getUTCDay() === 0 && isWorkday(shift(day, 1))) return shift(day, 1);
  let earlier = shift(day, -1);
  while (!isWorkday(earlier)) earlier = shift(earlier, -1);
  return earlier;
}
