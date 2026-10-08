import { PlanStep } from "@/lib/types";

export function planStepHref(step: PlanStep) {
  if (step.type === "knowledge_check") {
    return step.questionSource ? `/learn/knowledge-checks?source=${encodeURIComponent(step.questionSource)}` : "/learn/knowledge-checks";
  }
  if (step.assignmentStepId) {
    switch (step.type) {
      case "challenge":
        return step.challengeId
          ? `/practice/challenges?focus=challenge&step=${step.id}&challenge=${step.challengeId}`
          : `/practice/challenges?focus=challenge&step=${step.id}`;
      case "simulation":
        return step.simulationTemplateId
          ? `/practice/simulations?focus=simulation&step=${step.id}&template=${step.simulationTemplateId}`
          : `/practice/simulations?focus=simulation&step=${step.id}`;
      case "playbook":
        return step.playbookSlug
          ? `/learn/playbooks?playbook=${encodeURIComponent(step.playbookSlug)}`
          : "/learn/playbooks";
      case "content_review":
      case "shadow_meeting_log":
      case "mentor_review":
        return `/my-plan?step=${step.assignmentStepId}`;
      case "deal_prep":
        return `/practice/deal-prep?step=${step.assignmentStepId}`;
      default:
        return `/my-plan?step=${step.assignmentStepId}`;
    }
  }

  switch (step.type) {
    case "challenge":
      return `/practice/challenges?focus=challenge&step=${step.id}`;
    case "simulation":
      return `/practice/simulations?focus=simulation&step=${step.id}`;
    case "playbook":
      return step.playbookSlug
        ? `/learn/playbooks?playbook=${encodeURIComponent(step.playbookSlug)}`
        : "/learn/playbooks";
    case "deal_prep":
      return "/practice/deal-prep";
    case "content_review":
      return step.resourceUrl ?? "/learn";
    default:
      return "/my-plan";
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
    case "deal_prep":
      return "Open deal prep";
    case "knowledge_check":
      return step.passScore ? `Take the check (pass at ${step.passScore}%)` : "Take the check";
    case "playbook":
      return "Read playbook";
    default:
      return "Continue";
  }
}
