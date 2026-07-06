import type { PlanStep, UserPlan } from "@/lib/types";

export type SegmentProgress = {
  segmentIndex: number;
  label: string;
  totalSteps: number;
  validatedSteps: number;
  locked: boolean;
  hasGate: boolean;
  gateValidated: boolean;
};

export function buildSegmentProgress(plan: UserPlan): SegmentProgress[] {
  const unlocked = plan.unlockedSegmentMax ?? 1;

  return [1, 2, 3, 4]
    .map((segmentIndex) => {
      const steps = plan.steps.filter((step) => step.segmentIndex === segmentIndex);
      if (steps.length === 0) {
        return null;
      }

      const gate = steps.find((step) => step.isSegmentGate);

      return {
        segmentIndex,
        label: `Days ${(segmentIndex - 1) * 30 + 1}–${segmentIndex * 30}`,
        totalSteps: steps.length,
        validatedSteps: steps.filter((step) => step.status === "reviewed").length,
        locked: segmentIndex > unlocked,
        hasGate: Boolean(gate),
        gateValidated: gate?.status === "reviewed",
      };
    })
    .filter((segment): segment is SegmentProgress => segment !== null);
}

export function segmentStepsForIndex(steps: PlanStep[], segmentIndex: number): PlanStep[] {
  return steps.filter((step) => step.segmentIndex === segmentIndex);
}
