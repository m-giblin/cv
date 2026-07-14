import type { Profile, PlanStepType, UserPlan } from "@/lib/types";
import { businessDaysBetween } from "@/lib/plans/business-days";

export type CalendarStep = {
  assignmentStepId: string;
  planStepId: string;
  title: string;
  type: PlanStepType;
  dueOffset: number;
  dueDate: string;
  isGate: boolean;
  segmentIndex: number | null;
  status: string;
};

export type CalendarPlanRow = {
  assignmentId: string;
  userId: string;
  personName: string;
  planName: string;
  startDate: string;
  targetCompletion: string;
  steps: CalendarStep[];
};

export function planToCalendarRow(plan: UserPlan, profile?: Profile): CalendarPlanRow {
  const steps: CalendarStep[] = plan.steps
    .filter((step) => step.assignmentStepId && step.dueDate)
    .map((step) => ({
      assignmentStepId: step.assignmentStepId!,
      planStepId: step.id,
      title: step.title,
      type: step.type,
      dueOffset: Math.max(1, businessDaysBetween(plan.startDate, step.dueDate!)),
      dueDate: step.dueDate!,
      isGate: step.isSegmentGate ?? false,
      segmentIndex: step.segmentIndex ?? null,
      status: step.status,
    }));

  return {
    assignmentId: plan.id,
    userId: plan.userId,
    personName: profile?.fullName ?? "Team member",
    planName: plan.name,
    startDate: plan.startDate,
    targetCompletion: plan.targetCompletion || plan.startDate,
    steps,
  };
}

export function calendarRowsFromPlans(plans: UserPlan[], profiles: Profile[]): CalendarPlanRow[] {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  return plans.map((plan) => planToCalendarRow(plan, profileById.get(plan.userId)));
}

/** Mentor view: gate steps and mentor_review steps only. */
export function filterStepsForMentor(steps: CalendarStep[]): CalendarStep[] {
  return steps.filter((step) => step.isGate || step.type === "mentor_review");
}
