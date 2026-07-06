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
  sledDebrief?: boolean;
}) {
  if (input.sledDebrief) {
    return `You are an expert SailPoint SLED sales coach converting a completed roleplay debrief into a manager-ready coaching card.

Simulation:
- Persona: ${input.persona}
- Vertical: ${input.vertical}
- Solution focus: ${input.solutionFocus}
- SE level: ${input.level}

Full transcript and debrief:
${input.transcript}

The debrief already scored Discovery Quality, Challenger Insight, Objection Handling, SLED Specificity, and Call Control out of 10 each (total /50). Preserve that scoring logic in the coaching card score (map /50 to /100). Emphasize the exact rewrite suggestions and the one skill to drill next. Return only structured data that matches the schema.`;
  }

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

export function dealPrepPrompt(input: {
  accountName: string;
  industry: string;
  solutions: string[];
  accountContext: string;
  level: SeLevel;
  meetingType?: string;
  dealStage?: string;
  attendees?: string;
  competitors?: string;
  regenerateFocus?: string;
}) {
  const focusBlock = input.regenerateFocus
    ? `\nRegeneration focus: ${input.regenerateFocus}. Adjust the brief accordingly while keeping account-specific details.`
    : "";

  return `You are a SailPoint Sales Engineer enablement coach preparing an SE for an upcoming customer engagement.

Account: ${input.accountName}
Industry: ${input.industry}
Solutions in scope: ${input.solutions.join(", ")}
SE level: ${input.level}
Meeting type: ${input.meetingType ?? "general customer call"}
Deal stage: ${input.dealStage ?? "not specified"}
Attendees: ${input.attendees ?? "not specified"}
Known competitors: ${input.competitors ?? "none noted"}

Context from the SE or CRM notes:
${input.accountContext}
${focusBlock}

Generate practical, account-specific prep — not generic product training. Include:
- Stakeholder map entries formatted as "Role — priorities and how to approach"
- Likely objections with enough specificity to practice
- Sharp discovery questions tailored to this meeting type
- Competitive landmines (if they mention a competitor, how to handle it)
- Proof points (customer stories, metrics, demo flows) to bring
- Risk flags (compliance drivers, champion gaps, timeline risks)
- A talk track outline
- One thing to nail — the single most important outcome for this call
- linkedResources as short titles matching SailPoint enablement content (e.g. "ISC overview", "Healthcare reference architecture")
- personalizationBullets: 3 account-specific collateral bullets for LiveDoc-style personalization
- buyerPersona: primary buyer persona label for this meeting (e.g. "CISO — audit readiness")

Ground advice in identity security, governance, and SailPoint ISC/IDN/NHI themes where relevant.`;
}
