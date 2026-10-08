/** What each plan step asks the SE to do, in plain words. */
export const STEP_KIND: Record<string, string> = {
  content_review: "Read or watch, then confirm",
  challenge: "Complete a challenge",
  simulation: "Run an AI simulation",
  shadow_meeting_log: "Shadow meetings and log them",
  mentor_review: "Check in with their mentor",
  deal_prep: "Prepare for a deal",
  knowledge_check: "Pass a knowledge check",
  playbook: "Read a playbook chapter",
  custom: "Task",
};

export function stepKindLabel(type: string) {
  return STEP_KIND[type] ?? type.replaceAll("_", " ");
}
