import type { PlanStepType } from "@/lib/types";

const STEP_TYPE_LABELS: Record<PlanStepType, string> = {
  content_review: "Content",
  challenge: "Challenge",
  simulation: "Practice",
  shadow_meeting_log: "Shadow",
  mentor_review: "Review",
  deal_prep: "Deal prep",
  custom: "Task",
};

export function planStepTypeLabel(type: PlanStepType): string {
  return STEP_TYPE_LABELS[type] ?? "Task";
}

export function doThisNowCopy(step: { type: PlanStepType; title: string }) {
  if (step.type === "simulation") {
    return {
      eyebrow: "Flight simulator",
      cta: "Start roleplay",
      hint: "Practice the conversation before you go live — private AI feedback first, then manager review.",
    };
  }

  if (step.type === "shadow_meeting_log") {
    return {
      eyebrow: "Do this now",
      cta: "Log shadow session",
      hint: "Capture what you learned while it's fresh — business pain, what landed, follow-ups.",
    };
  }

  if (step.type === "challenge") {
    return {
      eyebrow: "Do this now",
      cta: "Open challenge",
      hint: "Hands-on artifact — submit evidence when you're ready for manager review.",
    };
  }

  return {
    eyebrow: "Do this now",
    cta: undefined as string | undefined,
    hint: undefined as string | undefined,
  };
}
