/**
 * A person's Record covers a chosen period (this month, quarter, year or a custom range) and can be
 * narrowed to onboarding or what came after. Periods are calendar days in the viewer's time zone;
 * the loader turns them into UTC instants for the date-range queries.
 */

export type RecordPreset = "month" | "quarter" | "year" | "custom";
export type RecordPhase = "onboarding" | "ongoing" | "all";

export type RecordPeriod = {
  preset: RecordPreset;
  /** First day, "YYYY-MM-DD", inclusive. */
  from: string;
  /** Last day, "YYYY-MM-DD", inclusive. */
  to: string;
  label: string;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isDateOnly(value: string | null | undefined): value is string {
  if (!value || !DATE_ONLY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function lastDayOf(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dayLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/**
 * The period for a preset, around `today` ("YYYY-MM-DD" in the viewer's zone). Custom ranges are
 * swapped if given backwards; an invalid custom range falls back to this month.
 */
export function resolveRecordPeriod(preset: RecordPreset, today: string, custom?: { from?: string | null; to?: string | null }): RecordPeriod {
  const [year, month] = today.split("-").map(Number) as [number, number];
  if (preset === "custom" && isDateOnly(custom?.from) && isDateOnly(custom?.to)) {
    const [from, to] = custom.from <= custom.to ? [custom.from, custom.to] : [custom.to, custom.from];
    return { preset, from, to, label: from === to ? dayLabel(from) : `${dayLabel(from)} to ${dayLabel(to)}` };
  }
  if (preset === "quarter") {
    const first = Math.floor((month - 1) / 3) * 3 + 1;
    return {
      preset,
      from: `${year}-${pad(first)}-01`,
      to: `${year}-${pad(first + 2)}-${pad(lastDayOf(year, first + 2))}`,
      label: `Q${(first + 2) / 3} ${year}`,
    };
  }
  if (preset === "year") {
    return { preset, from: `${year}-01-01`, to: `${year}-12-31`, label: String(year) };
  }
  return {
    preset: "month",
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDayOf(year, month))}`,
    label: `${MONTHS[month - 1]} ${year}`,
  };
}

/** Milliseconds `timeZone` is ahead of UTC at `instant`. */
function zoneOffset(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - (instant - (instant % 1000));
}

/** The UTC instant of midnight starting `day` in `timeZone` (UTC when the zone is unknown). */
export function startOfDayIn(day: string, timeZone: string) {
  const [year, month, date] = day.split("-").map(Number) as [number, number, number];
  const guess = Date.UTC(year, month - 1, date);
  let zone = "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    zone = timeZone;
  } catch {
    // Unknown zone: fall back to UTC.
  }
  const first = guess - zoneOffset(guess, zone);
  // Re-read the offset at the answer so a DST change between the guess and midnight is honoured.
  return guess - zoneOffset(first, zone);
}

/** The period as a half-open UTC range [start, end) for queries. */
export function periodBounds(period: Pick<RecordPeriod, "from" | "to">, timeZone: string) {
  const [year, month, day] = period.to.split("-").map(Number) as [number, number, number];
  const next = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  return { start: new Date(startOfDayIn(period.from, timeZone)).toISOString(), end: new Date(startOfDayIn(next, timeZone)).toISOString() };
}

export function inBounds(at: string | null | undefined, bounds: { start: string; end: string }) {
  if (!at) return false;
  const time = new Date(at).getTime();
  return time >= new Date(bounds.start).getTime() && time < new Date(bounds.end).getTime();
}

export type OnboardingWindow = { start: string; end: string | null } | null;

/**
 * Onboarding runs from the first plan's start to when the last plan finished. While any plan is
 * still open it has no end yet. No plans at all means everything is ongoing work.
 */
export function onboardingWindow(
  plans: { startDate: string; status: string; finishedAt: string | null }[],
): OnboardingWindow {
  const live = plans.filter((plan) => plan.status !== "cancelled");
  if (!live.length) return null;
  const start = live.map((plan) => plan.startDate).sort()[0]!;
  const open = live.some((plan) => plan.status !== "completed" || !plan.finishedAt);
  if (open) return { start, end: null };
  const end = live.map((plan) => plan.finishedAt!).sort().at(-1)!;
  return { start, end };
}

/** Which phase a dated item belongs to. Items that are part of onboarding by nature pass `onboarding: true`. */
export function phaseOf(at: string, window: OnboardingWindow, onboarding = false): Exclude<RecordPhase, "all"> {
  if (onboarding) return "onboarding";
  if (!window) return "ongoing";
  const day = at.slice(0, 10);
  if (day < window.start.slice(0, 10)) return "ongoing";
  if (window.end && new Date(at).getTime() > new Date(window.end).getTime()) return "ongoing";
  return "onboarding";
}

export function matchesPhase(item: { phase: Exclude<RecordPhase, "all"> }, phase: RecordPhase) {
  return phase === "all" || item.phase === phase;
}

export type ScoreTrend = "up" | "down" | "steady" | null;

export type ScoreSummary = {
  count: number;
  best: number | null;
  average: number | null;
  trend: ScoreTrend;
  /** Scores oldest first, for a sparkline. */
  points: number[];
};

/** Count, best, average and direction of a run of scored attempts (unscored attempts still count). */
export function summarizeScores(attempts: { at: string; score: number | null }[]): ScoreSummary {
  const ordered = [...attempts].sort((a, b) => a.at.localeCompare(b.at));
  const points = ordered.map((attempt) => attempt.score).filter((score): score is number => typeof score === "number");
  if (!points.length) return { count: ordered.length, best: null, average: null, trend: null, points };
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  let trend: ScoreTrend = null;
  if (points.length >= 2) {
    const half = Math.floor(points.length / 2);
    const change = mean(points.slice(points.length - half)) - mean(points.slice(0, half));
    trend = change >= 5 ? "up" : change <= -5 ? "down" : "steady";
  }
  return { count: ordered.length, best: Math.max(...points), average: Math.round(mean(points)), trend, points };
}

/** Newest first, the order every Record section lists in. */
export function newestFirst<T extends { at: string }>(items: T[]) {
  return [...items].sort((a, b) => b.at.localeCompare(a.at));
}
