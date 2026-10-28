/**
 * How busy a week already is with ramp steps, so Assign work only warns when a due date lands on a
 * week heavier than the person's usual one. During a ramp nearly every week has steps, so "any
 * steps that week" would warn every time and stop meaning anything.
 */

const DAY_MS = 86_400_000;

/** Monday of the week a calendar day falls in, as "YYYY-MM-DD". */
export function weekOf(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Steps per week, Monday-keyed. */
function countByWeek(rampDue: string[]) {
  const counts = new Map<string, number>();
  for (const day of rampDue) counts.set(weekOf(day), (counts.get(weekOf(day)) ?? 0) + 1);
  return counts;
}

/** The usual week: the median count from this week to the last week with steps, empty weeks included. */
export function typicalWeek(rampDue: string[], today: string) {
  if (!rampDue.length) return 0;
  const counts = countByWeek(rampDue);
  const last = [...counts.keys()].sort().at(-1)!;
  const values: number[] = [];
  for (let week = weekOf(today); week <= last; week = addDays(week, 7)) values.push(counts.get(week) ?? 0);
  if (!values.length) return 0;
  values.sort((a, b) => a - b);
  return values[Math.floor((values.length - 1) / 2)]!;
}

/**
 * The chosen week's load for one person, when it's clearly heavier than their usual week (at least
 * two steps more); otherwise null. One extra step is ordinary variation, not worth a warning.
 */
export function heavierWeek(rampDue: string[], dueDate: string, today: string) {
  const count = countByWeek(rampDue).get(weekOf(dueDate)) ?? 0;
  const typical = typicalWeek(rampDue, today);
  return count >= typical + 2 ? { count, typical } : null;
}

/**
 * The lightest of the next `lookahead` weeks after the due date's week, across everyone picked, when
 * it's lighter than the chosen week. Suggests that week's Friday as the due date.
 */
export function lighterWeek(rampDues: string[][], dueDate: string, lookahead = 3) {
  const total = (week: string) => rampDues.reduce((sum, due) => sum + (countByWeek(due).get(week) ?? 0), 0);
  const chosen = weekOf(dueDate);
  let best: { week: string; count: number } | null = null;
  for (let i = 1; i <= lookahead; i++) {
    const week = addDays(chosen, 7 * i);
    const count = total(week);
    if (!best || count < best.count) best = { week, count };
  }
  return best && best.count < total(chosen) ? { week: best.week, count: best.count, friday: addDays(best.week, 4) } : null;
}
