import type { CalMilestone, CalWeek } from "@/components/se/plan-calendar/types";
import type { AssignmentStatus, PlanStep, PlanStepType, UserPlan } from "@/lib/types";

const TYPE_LABEL: Record<PlanStepType, string> = {
  content_review: "Learn",
  challenge: "Challenge",
  simulation: "Sim",
  shadow_meeting_log: "Lab",
  mentor_review: "1:1",
  deal_prep: "Deal Prep",
  custom: "Task",
};

const TYPE_ICON: Record<PlanStepType, string> = {
  content_review: "📚",
  challenge: "⚡",
  simulation: "🎭",
  shadow_meeting_log: "🔬",
  mentor_review: "🗓️",
  deal_prep: "📋",
  custom: "📌",
};

function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayLabel(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatWeekLabel(weekIndex: number, weekStart: Date, weekEnd: Date): string {
  const startFmt = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endFmt = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Week ${weekIndex} · ${startFmt}–${endFmt}`;
}

function isStepComplete(status: AssignmentStatus): boolean {
  return status === "completed" || status === "reviewed";
}

export function milestoneStatusForStep(step: PlanStep, today = new Date()): CalMilestone["status"] {
  if (isStepComplete(step.status)) {
    return "DONE";
  }

  if (!step.dueDate) {
    return "UPCOMING";
  }

  const due = parseLocalDate(step.dueDate);
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const dueStart = new Date(due);
  dueStart.setHours(0, 0, 0, 0);

  if (dueStart.getTime() === todayStart.getTime()) {
    return "DUE TODAY";
  }

  if (dueStart.getTime() < todayStart.getTime()) {
    return "OPEN";
  }

  return "UPCOMING";
}

export function stepToCalMilestone(step: PlanStep, today = new Date()): CalMilestone | null {
  if (!step.dueDate) {
    return null;
  }

  const type = step.isSegmentGate ? "Gate" : TYPE_LABEL[step.type];
  const icon = step.isSegmentGate ? "🚧" : TYPE_ICON[step.type];

  return {
    day: formatDayLabel(step.dueDate),
    title: step.title,
    type,
    status: milestoneStatusForStep(step, today),
    icon,
    date: step.dueDate,
    managerNote: step.type === "mentor_review" && step.description ? step.description : undefined,
  };
}

export function userPlanToCalWeeks(plan: UserPlan, today = new Date()): CalWeek[] {
  const datedSteps = plan.steps
    .filter((step) => step.dueDate)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));

  if (datedSteps.length === 0) {
    return [];
  }

  const planStartMonday = startOfWeekMonday(parseLocalDate(plan.startDate));
  const buckets = new Map<string, { weekIndex: number; steps: PlanStep[]; start: Date; end: Date }>();

  for (const step of datedSteps) {
    const due = parseLocalDate(step.dueDate!);
    const weekStart = startOfWeekMonday(due);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4);

    const key = weekStart.toISOString();
    const weekIndex = Math.max(
      1,
      Math.floor((weekStart.getTime() - planStartMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
    );

    const existing = buckets.get(key);
    if (existing) {
      existing.steps.push(step);
      if (due.getTime() > existing.end.getTime()) {
        existing.end = due;
      }
    } else {
      buckets.set(key, { weekIndex, steps: [step], start: weekStart, end: due });
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, bucket]) => {
      const milestones = bucket.steps
        .map((step) => stepToCalMilestone(step, today))
        .filter((ms): ms is CalMilestone => Boolean(ms));

      return {
        label: formatWeekLabel(bucket.weekIndex, bucket.start, bucket.end),
        done: milestones.every((ms) => ms.status === "DONE"),
        milestones,
      };
    });
}

export function calendarMonthFromWeeks(weeks: CalWeek[]): { year: number; month: number; monthLabel: string } {
  const dated = weeks.flatMap((week) => week.milestones).filter((ms) => ms.date);
  if (dated.length === 0) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return {
      year,
      month,
      monthLabel: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  }

  const counts = new Map<string, number>();
  for (const ms of dated) {
    const d = parseLocalDate(ms.date!);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const [bestKey] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  const [yearStr, monthStr] = (bestKey ?? "").split("-");
  const year = Number(yearStr) || new Date().getFullYear();
  const month = Number(monthStr) || new Date().getMonth() + 1;
  const labelDate = new Date(year, month - 1, 1);

  return {
    year,
    month,
    monthLabel: labelDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}
