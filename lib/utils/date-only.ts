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

/**
 * Moves a calendar day off the weekend: Saturday to the Friday before, Sunday to the Monday after.
 * Keeps a run of dates in order, so steps due on consecutive days never swap.
 */
export function nearestWeekday(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  const day = date.getUTCDay();
  if (day === 6) date.setUTCDate(date.getUTCDate() - 1);
  else if (day === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
