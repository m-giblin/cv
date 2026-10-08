import { PLAN_WEEKS, SEGMENT_NAMES, type DbTemplate } from "@/lib/admin/plan-builder";
import { isStepValidated } from "@/lib/se/ramp-model";
import type { PlanStep, Profile, UserPlan } from "@/lib/types";

/**
 * One program model for every portal. A program is a ramp template (onboarding_plans row); people
 * are enrolled through plan assignments. Phases are the builder's four segments over PLAN_WEEKS,
 * the same names the SE sees on My ramp.
 */
export const PROGRAM_WEEKS = PLAN_WEEKS;

export const PROGRAM_PHASES = SEGMENT_NAMES.map((name, index) => ({
  index: index + 1,
  name,
  summary: [
    "Product, platform basics and the sales motion",
    "Demos, labs, discovery and objection practice",
    "Deal prep, executive stories and customer advisory",
    "Certification gates and manager sign-off",
  ][index]!,
}));

export type PhaseStatus = "complete" | "active" | "overdue" | "upcoming" | "empty";

export type PhaseProgress = {
  index: number;
  name: string;
  status: PhaseStatus;
  done: number;
  total: number;
};

export type EnrollmentHealth = "not_started" | "on_track" | "at_risk" | "complete";

export type EnrollmentSummary = {
  plan: UserPlan;
  person: Profile | null;
  progress: number;
  done: number;
  total: number;
  overdue: number;
  phases: PhaseProgress[];
  nextStep: PlanStep | null;
  health: EnrollmentHealth;
  /** 1-based week of the program the person is in today, capped to the program length. */
  week: number;
};

export type ProgramSummary = {
  id: string;
  name: string;
  description: string;
  stepCount: number;
  stepsPerPhase: number[];
  enrollments: EnrollmentSummary[];
  avgProgress: number | null;
  atRisk: number;
  overdue: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Phase (1-4) of a step: its segment when set, otherwise its quarter of the plan by order. */
export function phaseOfStep(step: Pick<PlanStep, "segmentIndex">, position: number, total: number): number {
  if (step.segmentIndex && step.segmentIndex >= 1 && step.segmentIndex <= PROGRAM_PHASES.length) {
    return step.segmentIndex;
  }
  if (total <= 0) return 1;
  return Math.min(PROGRAM_PHASES.length, Math.floor((position / total) * PROGRAM_PHASES.length) + 1);
}

export function isStepOverdue(step: PlanStep, today: string): boolean {
  return Boolean(step.dueDate && step.dueDate.slice(0, 10) < today && !isStepValidated(step.status));
}

export function summarizeEnrollment(plan: UserPlan, person: Profile | null, now: Date = new Date()): EnrollmentSummary {
  const today = isoDay(now);
  const steps = [...plan.steps].sort((a, b) => a.order - b.order);
  const total = steps.length;
  const doneSteps = steps.filter((step) => isStepValidated(step.status));
  const overdueSteps = steps.filter((step) => isStepOverdue(step, today));

  const phases: PhaseProgress[] = PROGRAM_PHASES.map((phase) => ({
    index: phase.index,
    name: phase.name,
    status: "empty" as PhaseStatus,
    done: 0,
    total: 0,
  }));
  const phaseOverdue = new Array(PROGRAM_PHASES.length).fill(false) as boolean[];
  steps.forEach((step, position) => {
    const phase = phases[phaseOfStep(step, position, total) - 1]!;
    phase.total += 1;
    if (isStepValidated(step.status)) phase.done += 1;
    if (isStepOverdue(step, today)) phaseOverdue[phase.index - 1] = true;
  });

  // The first phase with work left is the active one; later phases are upcoming.
  let activeFound = false;
  for (const phase of phases) {
    if (phase.total === 0) continue;
    if (phase.done === phase.total) {
      phase.status = "complete";
    } else if (phaseOverdue[phase.index - 1]) {
      phase.status = "overdue";
      activeFound = true;
    } else if (!activeFound) {
      phase.status = "active";
      activeFound = true;
    } else {
      phase.status = "upcoming";
    }
  }

  const progress = total > 0 ? Math.round((doneSteps.length / total) * 100) : 0;
  const nextStep = steps.find((step) => !isStepValidated(step.status)) ?? null;
  const started = steps.some((step) => step.status !== "not_started");
  const health: EnrollmentHealth =
    total > 0 && doneSteps.length === total
      ? "complete"
      : overdueSteps.length > 0
        ? "at_risk"
        : started
          ? "on_track"
          : "not_started";

  const start = plan.startDate ? new Date(`${plan.startDate.slice(0, 10)}T00:00:00Z`).getTime() : now.getTime();
  const week = Math.min(PROGRAM_WEEKS, Math.max(1, Math.floor((now.getTime() - start) / (7 * DAY_MS)) + 1));

  return {
    plan,
    person,
    progress,
    done: doneSteps.length,
    total,
    overdue: overdueSteps.length,
    phases,
    nextStep,
    health,
    week,
  };
}

function templateStepsPerPhase(template: DbTemplate): number[] {
  const counts = new Array(PROGRAM_PHASES.length).fill(0) as number[];
  const ordered = [...template.steps].sort((a, b) => a.sort_order - b.sort_order);
  ordered.forEach((step, position) => {
    const meta = (step.metadata ?? {}) as { segmentIndex?: unknown };
    const segmentIndex = typeof meta.segmentIndex === "number" ? meta.segmentIndex : null;
    counts[phaseOfStep({ segmentIndex }, position, ordered.length) - 1]! += 1;
  });
  return counts;
}

/** Every program with its enrolled people. Plans whose template isn't listed are grouped by name. */
export function summarizePrograms(
  templates: DbTemplate[],
  plans: UserPlan[],
  people: Profile[],
  now: Date = new Date(),
): ProgramSummary[] {
  const personById = new Map(people.map((person) => [person.id, person]));
  const byTemplate = new Map<string, UserPlan[]>();
  for (const plan of plans) {
    const list = byTemplate.get(plan.planTemplateId) ?? [];
    list.push(plan);
    byTemplate.set(plan.planTemplateId, list);
  }

  const summaries: ProgramSummary[] = templates.map((template) => {
    const enrollments = (byTemplate.get(template.id) ?? [])
      .map((plan) => summarizeEnrollment(plan, personById.get(plan.userId) ?? null, now))
      .sort((a, b) => b.overdue - a.overdue || a.progress - b.progress);
    byTemplate.delete(template.id);
    return toSummary(template.id, template.name, template.description ?? "", template.steps.length, templateStepsPerPhase(template), enrollments);
  });

  // Enrollments in programs this viewer can't list (for example a locked template) still show.
  for (const [templateId, list] of byTemplate) {
    const enrollments = list.map((plan) => summarizeEnrollment(plan, personById.get(plan.userId) ?? null, now));
    const sample = enrollments[0]!;
    const stepsPerPhase = sample.phases.map((phase) => phase.total);
    summaries.push(toSummary(templateId, sample.plan.name, "", sample.total, stepsPerPhase, enrollments));
  }

  return summaries;
}

function toSummary(
  id: string,
  name: string,
  description: string,
  stepCount: number,
  stepsPerPhase: number[],
  enrollments: EnrollmentSummary[],
): ProgramSummary {
  const avgProgress = enrollments.length
    ? Math.round(enrollments.reduce((sum, item) => sum + item.progress, 0) / enrollments.length)
    : null;
  return {
    id,
    name,
    description,
    stepCount,
    stepsPerPhase,
    enrollments,
    avgProgress,
    atRisk: enrollments.filter((item) => item.health === "at_risk").length,
    overdue: enrollments.reduce((sum, item) => sum + item.overdue, 0),
  };
}

/**
 * Enrollment candidates. The roster is SEs; the signed-in admin or manager is added so they can
 * put themselves on a program.
 */
export function enrollRoster(people: Profile[], viewer: Profile | null | undefined): Profile[] {
  if (!viewer || people.some((person) => person.id === viewer.id)) return people;
  return [viewer, ...people];
}

/** SEs with no active program, for the "not enrolled" prompt. */
export function unenrolledPeople(people: Profile[], plans: UserPlan[]): Profile[] {
  const enrolled = new Set(plans.filter((plan) => plan.status !== "completed").map((plan) => plan.userId));
  return people.filter((person) => !enrolled.has(person.id));
}

/** Week (1..PROGRAM_WEEKS) a dated step falls in for an enrollment, or null without a date. */
export function stepWeek(step: PlanStep, startDate: string): number | null {
  if (!step.dueDate || !startDate) return null;
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00Z`).getTime();
  const due = new Date(`${step.dueDate.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.min(PROGRAM_WEEKS, Math.max(1, Math.floor((due - start) / (7 * DAY_MS)) + 1));
}
