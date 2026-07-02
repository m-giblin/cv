import { PlanStep } from "@/lib/types";

export function planStepHref(step: PlanStep) {
  if (step.assignmentStepId) {
    switch (step.type) {
      case "challenge":
        return step.challengeId
          ? `/challenges?focus=challenge&step=${step.id}&challenge=${step.challengeId}`
          : `/challenges?focus=challenge&step=${step.id}`;
      case "simulation":
        return step.simulationTemplateId
          ? `/simulations?focus=simulation&step=${step.id}&template=${step.simulationTemplateId}`
          : `/simulations?focus=simulation&step=${step.id}`;
      case "content_review":
      case "shadow_meeting_log":
      case "mentor_review":
        return `/plan-steps/${step.assignmentStepId}`;
      default:
        return `/plan-steps/${step.assignmentStepId}`;
    }
  }

  switch (step.type) {
    case "challenge":
      return `/challenges?focus=challenge&step=${step.id}`;
    case "simulation":
      return `/simulations?focus=simulation&step=${step.id}`;
    case "content_review":
      return step.resourceUrl ?? "/resources";
    default:
      return "/dashboard";
  }
}

export function planStepActionLabel(step: PlanStep) {
  switch (step.type) {
    case "challenge":
      return "Open challenge";
    case "simulation":
      return "Start simulation";
    case "content_review":
      return "Review content";
    case "shadow_meeting_log":
      return "Log shadow meeting";
    case "mentor_review":
      return "Request mentor review";
    default:
      return "Continue";
  }
}
