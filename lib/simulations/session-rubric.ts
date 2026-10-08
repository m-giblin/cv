import { parseSimPrompt } from "@/lib/admin/practice-library";

export type RubricCriterion = {
  label: string;
  description: string;
};

/** Uses the scenario's own scoring goals when the prompt stores them. */
export function scenarioFromScoring(
  promptBody: string,
  persona: string,
): { context: string; objective: string; criteria: RubricCriterion[] } | null {
  const parsed = parseSimPrompt(promptBody);
  if (!parsed.goals.length) return null;
  const situation = parsed.scenario.match(/^Situation:\s*(.+)$/m)?.[1]?.trim();
  const pass = parsed.passMark ? ` Pass at ${parsed.passMark}.` : "";
  return {
    context: situation ?? `Roleplay with ${persona}.`,
    objective: `Meet each goal below.${pass}`,
    criteria: parsed.goals.map((goal) => ({ label: goal, description: "" })),
  };
}

export function simulationRubricCriteria(options: {
  isElevatorPitch?: boolean;
  isObjectionPractice?: boolean;
  persona?: string;
}): RubricCriterion[] {
  if (options.isElevatorPitch) {
    return [
      { label: "Hook & clarity", description: "Business outcome in the first 30 seconds — not product modules." },
      { label: "SailPoint differentiation", description: "Why ISC vs directory-only or DIY approaches." },
      { label: "Call to action", description: "Clear next step: workshop, discovery, or technical deep-dive." },
    ];
  }

  if (options.isObjectionPractice) {
    return [
      { label: "Acknowledge & reframe", description: "Validate concern without conceding the deal." },
      { label: "Proof & specificity", description: "Customer story, metric, or architecture anchor." },
      { label: "Discovery follow-up", description: "Question that advances the evaluation." },
    ];
  }

  return [
    { label: "Discovery", description: "Customer context before product — pain, stakeholders, timeline." },
    { label: "Objection handling", description: "Land competitive traps with governance framing." },
    { label: "Executive storyline", description: "Outcome-first narrative tied to SailPoint ISC/AIS." },
    { label: "Next step", description: "Mutual action or technical follow-up agreed." },
  ];
}
