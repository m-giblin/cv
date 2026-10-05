import { planStepTypeLabel } from "@/lib/plans/step-labels";
import type { PlanStep, UserPlan } from "@/lib/types";

/**
 * Derived view of an SE's ramp plan for Today and My ramp: runway weeks, segments, next step,
 * lifecycle row and upcoming schedule. Pure functions over the plan the pages already load.
 */

/** Names for `segmentIndex` 1–4, matching the plan builder's segment model. */
export const RAMP_SEGMENT_NAMES = ["Foundations", "Field skills", "Advisory readiness", "Certification"] as const;

const DAY_MS = 86_400_000;

function dayStart(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
}

function todayStart(now: Date): number {
  return dayStart(now.toISOString());
}

export function isStepValidated(status: PlanStep["status"]): boolean {
  return status === "reviewed" || status === "completed";
}

export function isStepWithReviewer(status: PlanStep["status"]): boolean {
  return status === "submitted" || status === "under_review";
}

export function sortSteps(steps: PlanStep[]): PlanStep[] {
  return [...steps].sort((a, b) => a.order - b.order);
}

export function pad2(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

export type RampSegment = {
  index: number;
  label: string;
  weeks: number;
  startWeek: number;
  endWeek: number;
  steps: PlanStep[];
  validated: number;
  gate: PlanStep | null;
  gatePassed: boolean;
  locked: boolean;
  state: "done" | "current" | "upcoming";
};

export type RampModel = {
  steps: PlanStep[];
  total: number;
  validated: number;
  awaitingReview: number;
  totalWeeks: number;
  currentWeek: number;
  daysLeft: number | null;
  overdue: number;
  segments: RampSegment[];
  nextStep: PlanStep | null;
  nextStepNumber: number;
  /** Steps after the next one, in plan order. */
  upcoming: PlanStep[];
};

export function rampTotalWeeks(plan: Pick<UserPlan, "startDate" | "targetCompletion">): number {
  if (!plan.startDate || !plan.targetCompletion) return 13;
  const days = (dayStart(plan.targetCompletion) - dayStart(plan.startDate)) / DAY_MS;
  return Math.max(1, Math.round(days / 7));
}

export function rampCurrentWeek(
  plan: Pick<UserPlan, "startDate" | "targetCompletion">,
  now = new Date(),
): number {
  const total = rampTotalWeeks(plan);
  if (!plan.startDate) return 1;
  const days = Math.floor((todayStart(now) - dayStart(plan.startDate)) / DAY_MS);
  return Math.min(total, Math.max(1, Math.floor(days / 7) + 1));
}

/** Splits `total` weeks across `count` segments; the remainder goes to the last segments (4·4·5). */
export function splitWeeks(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const extra = total - base * count;
  return Array.from({ length: count }, (_, i) => Math.max(1, base + (i >= count - extra ? 1 : 0)));
}

/** First step that is not validated and whose earlier steps are all validated or with a reviewer. */
export function findNextStep(steps: PlanStep[]): PlanStep | null {
  return steps.find((step) => !isStepValidated(step.status)) ?? null;
}

export function buildRampModel(plan: UserPlan, now = new Date()): RampModel {
  const steps = sortSteps(plan.steps);
  const totalWeeks = rampTotalWeeks(plan);
  const currentWeek = rampCurrentWeek(plan, now);
  const unlocked = plan.unlockedSegmentMax ?? 1;
  const today = todayStart(now);

  const indices = [...new Set(steps.map((step) => step.segmentIndex ?? 0))]
    .filter((index) => index > 0)
    .sort((a, b) => a - b);
  const segmentIndices = indices.length > 0 ? indices : [0];
  const weekSplit = splitWeeks(totalWeeks, segmentIndices.length);

  let startWeek = 1;
  const segments: RampSegment[] = segmentIndices.map((index, position) => {
    const segmentSteps = index === 0 ? steps : steps.filter((step) => step.segmentIndex === index);
    const weeks = weekSplit[position] ?? 1;
    const endWeek = startWeek + weeks - 1;
    const gate = segmentSteps.find((step) => step.isSegmentGate) ?? null;
    const validated = segmentSteps.filter((step) => isStepValidated(step.status)).length;
    const gatePassed = gate
      ? isStepValidated(gate.status)
      : segmentSteps.length > 0 && validated === segmentSteps.length;
    const segment: RampSegment = {
      index,
      label: index === 0 ? "Ramp" : (RAMP_SEGMENT_NAMES[index - 1] ?? `Segment ${index}`),
      weeks,
      startWeek,
      endWeek,
      steps: segmentSteps,
      validated,
      gate,
      gatePassed,
      locked: index > unlocked,
      state: "upcoming",
    };
    startWeek = endWeek + 1;
    return segment;
  });

  const nextStep = findNextStep(steps);
  const nextSegmentIndex = nextStep?.segmentIndex ?? null;
  for (const segment of segments) {
    if (segment.gatePassed && segment.steps.every((step) => isStepValidated(step.status))) {
      segment.state = "done";
    } else if (
      (nextSegmentIndex !== null && segment.index === nextSegmentIndex) ||
      (segment.index === 0 && nextStep)
    ) {
      segment.state = "current";
    }
  }
  if (!segments.some((segment) => segment.state === "current")) {
    const firstOpen = segments.find((segment) => segment.state !== "done");
    if (firstOpen) firstOpen.state = "current";
  }

  const nextIndex = nextStep ? steps.findIndex((step) => step.id === nextStep.id) : -1;

  return {
    steps,
    total: steps.length,
    validated: steps.filter((step) => isStepValidated(step.status)).length,
    awaitingReview: steps.filter((step) => isStepWithReviewer(step.status)).length,
    totalWeeks,
    currentWeek,
    daysLeft: plan.targetCompletion
      ? Math.max(0, Math.ceil((dayStart(plan.targetCompletion) - today) / DAY_MS))
      : null,
    overdue: steps.filter(
      (step) => !isStepValidated(step.status) && step.dueDate && dayStart(step.dueDate) < today,
    ).length,
    segments,
    nextStep,
    nextStepNumber: nextIndex >= 0 ? nextIndex + 1 : steps.length,
    upcoming: nextIndex >= 0 ? steps.slice(nextIndex + 1) : [],
  };
}

/** "ON PACE" unless validated work is overdue. */
export function paceLabel(model: Pick<RampModel, "overdue">): string {
  return model.overdue > 0 ? `${model.overdue} OVERDUE` : "ON PACE";
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** "THU 09 OCT" */
export function formatDueMono(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return `${WEEKDAYS[date.getDay()]} ${pad2(date.getDate())} ${MONTHS[date.getMonth()]}`;
}

/** "09 OCT" */
export function formatShortDate(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return `${pad2(date.getDate())} ${MONTHS[date.getMonth()]}`;
}

export function dayAndMonth(iso: string | undefined | null): { day: string; month: string } {
  if (!iso) return { day: "—", month: "TBD" };
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return { day: "—", month: "TBD" };
  return { day: pad2(date.getDate()), month: MONTHS[date.getMonth()] ?? "" };
}

export type LifecycleCell = { label: string; stage: "done" | "current" | "upcoming" };

/** Flight-strip lifecycle row: requested → in progress → validated (by {reviewer}). */
export function stepLifecycle(step: PlanStep, reviewerFirstName: string | null): LifecycleCell[] {
  const reviewer = (reviewerFirstName ?? "manager").toUpperCase();
  const validated = isStepValidated(step.status);
  const withReviewer = isStepWithReviewer(step.status);
  return [
    { label: "✓ REQUESTED", stage: "done" },
    validated || withReviewer
      ? { label: "✓ SUBMITTED", stage: "done" }
      : { label: step.status === "not_started" ? "● READY TO START" : "● IN PROGRESS", stage: "current" },
    validated
      ? { label: "✓ VALIDATED", stage: "done" }
      : withReviewer
        ? { label: `● WITH ${reviewer}`, stage: "current" }
        : { label: `○ VALIDATED BY ${reviewer}`, stage: "upcoming" },
  ];
}

/** Mono meta line for a step: "CHALLENGE · DUE THU 09 OCT". */
export function stepMeta(step: PlanStep): string {
  const due = formatDueMono(step.dueDate);
  return [planStepTypeLabel(step.type).toUpperCase(), due ? `DUE ${due}` : null].filter(Boolean).join(" · ");
}

export type StepTagInfo = { label: string; tone: "neutral" | "blue" | "success" | "warning" | "danger" };

export function stepStatusTag(step: PlanStep): StepTagInfo {
  if (step.locked) return { label: "LOCKED", tone: "neutral" };
  switch (step.status) {
    case "reviewed":
    case "completed":
      return { label: "✓ VALIDATED", tone: "success" };
    case "submitted":
    case "under_review":
      return { label: "● IN REVIEW", tone: "blue" };
    case "in_progress":
      return { label: "● IN PROGRESS", tone: "blue" };
    default:
      return { label: "NOT STARTED", tone: "neutral" };
  }
}
