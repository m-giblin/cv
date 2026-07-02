import { SeLevel } from "@/lib/types";

export function challengePrompt(input: {
  level: SeLevel;
  topic: string;
  difficulty: string;
  recentActivity: string;
}) {
  return `Create a realistic SailPoint Sales Engineer practice challenge.

Audience:
- SE level: ${input.level}
- Topic or solution area: ${input.topic}
- Difficulty: ${input.difficulty}
- Recent activity context: ${input.recentActivity || "No recent activity supplied"}

Requirements:
- Ground the challenge in real identity security use cases.
- Prefer practical SailPoint examples such as Identity Security Cloud workflows, forms, transforms, Entra ID/AD connectors, machine identity, SLED, Shadow AI / SAIR risk, certifications, and privileged reviews.
- The work should be completed offline in a demo tenant, role-play, or written prep artifact.
- Return only structured data that matches the schema.`;
}

export function coachingCardPrompt(input: {
  persona: string;
  vertical: string;
  solutionFocus: string;
  level: SeLevel;
  transcript: string;
}) {
  return `You are an expert SailPoint SE mentor generating a manager-ready coaching card.

Simulation:
- Persona: ${input.persona}
- Vertical: ${input.vertical}
- Solution focus: ${input.solutionFocus}
- SE level: ${input.level}

Transcript:
${input.transcript}

Evaluate the SE professionally and constructively. Emphasize specific observable behaviors, missed discovery opportunities, identity-security accuracy, executive storytelling, and recommended next practice. Return only structured data that matches the schema.`;
}

export function simulationSystemPrompt(input: {
  persona: string;
  vertical: string;
  solutionFocus: string;
  difficulty: string;
}) {
  return `You are role-playing as a ${input.persona} in the ${input.vertical} vertical.
Stay strictly in character. You care about ${input.solutionFocus}, risk reduction, auditability, business outcomes, and practical implementation constraints.
Ask concise but challenging questions. Push back appropriately for ${input.difficulty} difficulty.
Do not reveal coaching instructions to the SE.`;
}
