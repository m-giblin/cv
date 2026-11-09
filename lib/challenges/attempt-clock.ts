export const REMINDER_WORKING_DAYS = 2;
export const WARNING_WORKING_DAYS = 3;
export const LIMIT_WORKING_DAYS = 5;

export type ClockAction = "remind" | "warn" | "cancel";

type ClockAttempt = {
  clock_started_at: string;
  reminder_sent_at: string | null;
  warning_sent_at: string | null;
};

const DAY_MS = 86_400_000;

function utcDay(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS);
}

function isWeekend(day: number): boolean {
  const weekday = new Date(day * DAY_MS).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/** Monday to Friday days that have passed since the start date, not counting the start date. */
export function workingDaysElapsed(from: Date, to: Date): number {
  let elapsed = 0;
  for (let day = utcDay(from) + 1; day <= utcDay(to); day += 1) {
    if (!isWeekend(day)) elapsed += 1;
  }
  return elapsed;
}

/** The one thing due now for an active attempt. A missed run catches up with the latest step only. */
export function nextClockAction(attempt: ClockAttempt, now: Date): ClockAction | null {
  const elapsed = workingDaysElapsed(new Date(attempt.clock_started_at), now);
  if (elapsed >= LIMIT_WORKING_DAYS) return "cancel";
  if (elapsed >= WARNING_WORKING_DAYS) return attempt.warning_sent_at ? null : "warn";
  if (elapsed >= REMINDER_WORKING_DAYS) return attempt.reminder_sent_at ? null : "remind";
  return null;
}

/** Whether someone may start this challenge, given their most recent attempt at it. */
export function startBlockedReason(
  latest: { status: string; restart_allowed_at: string | null } | null | undefined,
): string | null {
  if (latest?.status === "approved") return "You've already completed this challenge.";
  if (latest?.status === "canceled" && !latest.restart_allowed_at) {
    return "This challenge was canceled. Talk with your manager so they can allow a restart.";
  }
  return null;
}
