import { planStepTypeLabel } from "@/lib/plans/step-labels";
import type { PlanStep, UserPlan } from "@/lib/types";
import { planStepHref } from "@/lib/utils/plan-links";

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

/** "On pace" unless validated work is overdue. */
export function paceLabel(model: Pick<RampModel, "overdue">): string {
  return model.overdue > 0 ? `${model.overdue} overdue` : "On pace";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDay(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Thu, Oct 9" */
export function formatDay(iso: string | undefined | null): string | null {
  const date = parseDay(iso);
  if (!date) return null;
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** "Oct 9" */
export function formatShortDate(iso: string | undefined | null): string | null {
  const date = parseDay(iso);
  if (!date) return null;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** Kept for older callers; same as `formatDay`. */
export const formatDueMono = formatDay;

/** Month ("Oct") over day ("9") for date rows. */
export function dayAndMonth(iso: string | undefined | null): { day: string; month: string } {
  const date = parseDay(iso);
  if (!date) return { day: "–", month: "TBD" };
  return { day: String(date.getDate()), month: MONTHS[date.getMonth()] ?? "" };
}

/** Whole days from today to `iso` (negative when past). */
export function daysUntil(iso: string | undefined | null, now = new Date()): number | null {
  if (!iso) return null;
  return Math.round((dayStart(iso) - todayStart(now)) / DAY_MS);
}

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

/** "five" for 5; digits past twenty. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export type LifecycleCell = { label: string; stage: "done" | "current" | "upcoming" };

/** Step-card lifecycle: Requested → In progress → Validated (or "With {reviewer}" once submitted). */
export function stepLifecycle(step: PlanStep, reviewerFirstName: string | null): LifecycleCell[] {
  const validated = isStepValidated(step.status);
  const withReviewer = isStepWithReviewer(step.status);
  return [
    { label: "Requested", stage: "done" },
    validated || withReviewer
      ? { label: "Submitted", stage: "done" }
      : { label: step.status === "not_started" ? "Not started" : "In progress", stage: "current" },
    validated
      ? { label: "Validated", stage: "done" }
      : withReviewer
        ? { label: `With ${reviewerFirstName ?? "your manager"}`, stage: "current" }
        : { label: "Validated", stage: "upcoming" },
  ];
}

/** Plain meta line for a step: "Challenge, due Thu, Oct 9". */
export function stepMeta(step: PlanStep): string {
  const due = formatDay(step.dueDate);
  const type = planStepTypeLabel(step.type);
  return due ? `${type}, due ${due}` : type;
}

export type StepStatusInfo = { label: string; tone: "neutral" | "blue" | "success" | "warning" | "danger" };

/** Dot + word status for a step (use with StatusPill). */
export function stepStatusTag(step: PlanStep): StepStatusInfo {
  if (step.locked) return { label: "Locked", tone: "neutral" };
  switch (step.status) {
    case "reviewed":
    case "completed":
      return { label: "Validated", tone: "success" };
    case "submitted":
    case "under_review":
      return { label: "In review", tone: "blue" };
    case "in_progress":
      return { label: "In progress", tone: "blue" };
    default:
      return { label: "Not started", tone: "neutral" };
  }
}

/** Steps with an assignment open in place inside My ramp (`?step=`); others go to their practice tool. */
export function stepDetailHref(step: PlanStep): string {
  return step.assignmentStepId ? `/my-plan?step=${encodeURIComponent(step.assignmentStepId)}` : planStepHref(step);
}
