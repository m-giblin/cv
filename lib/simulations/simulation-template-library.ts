import type { SimulationDifficulty } from "@/lib/simulations/prompt-template";
import { ELEVATOR_PITCH_TEMPLATE, SLED_ROLEPLAY_TEMPLATE } from "@/lib/simulations/prompt-template";

export type SimulationTemplateSeed = {
  name: string;
  persona: string;
  vertical: string;
  solutionFocus: string;
  difficulty: SimulationDifficulty;
  promptBody: string;
  practiceRoundsBeforeSubmit?: number;
};

function roleplay(
  name: string,
  vertical: string,
  solutionFocus: string,
  difficulty: SimulationDifficulty = "intermediate",
): SimulationTemplateSeed {
  return {
    name,
    persona: "Dynamic (AI-generated buyer)",
    vertical,
    solutionFocus,
    difficulty,
    promptBody: SLED_ROLEPLAY_TEMPLATE,
    practiceRoundsBeforeSubmit: 1,
  };
}

function elevatorPitch(
  name: string,
  persona: string,
  vertical: string,
  solutionFocus: string,
  personaBlock: string,
  difficulty: SimulationDifficulty = "intermediate",
): SimulationTemplateSeed {
  const promptBody = ELEVATOR_PITCH_TEMPLATE.replace(
    /MY FIRST PERSONA IS:[\s\S]*$/,
    `MY FIRST PERSONA IS:\n${personaBlock}`,
  );
  return {
    name,
    persona,
    vertical,
    solutionFocus,
    difficulty,
    promptBody,
    practiceRoundsBeforeSubmit: 1,
  };
}

const OBJECTION_DRILL = `You are running a focused SailPoint objection-handling drill.

OBJECTION TO PRACTICE: "{{objection}}"

Stay in character as a skeptical buyer. Push back twice. If the SE types HINT:, give one coaching tip with exact words.
After 4 exchanges end with OUTCOME: WIN ✅ / DRAW ⚖ / LOST ❌ and a 3-bullet debrief on objection handling only.`;

function objectionDrill(
  name: string,
  objection: string,
  vertical: string,
  solutionFocus: string,
): SimulationTemplateSeed {
  return {
    name,
    persona: "Skeptical buyer (objection drill)",
    vertical,
    solutionFocus,
    difficulty: "intermediate",
    promptBody: OBJECTION_DRILL.replace("{{objection}}", objection),
    practiceRoundsBeforeSubmit: 2,
  };
}

/** 20 new templates — baseline is SLED Roleplay + SLED Elevator Pitch (migrations). */
export const SIMULATION_TEMPLATE_LIBRARY: SimulationTemplateSeed[] = [
  roleplay("FED Agency IAM Roleplay", "FED", "SailPoint Identity Security Cloud (ISC)", "intermediate"),
  roleplay("Healthcare HIPAA Identity Roleplay", "Healthcare", "SailPoint Identity Security Cloud (ISC)", "intermediate"),
  roleplay("Enterprise Financial Services Roleplay", "Enterprise", "SailPoint Identity Security Cloud (ISC)", "advanced"),
  roleplay("SLED Rough — Budget Frozen Surprise", "SLED", "SailPoint Identity Security Cloud (ISC)", "advanced"),
  roleplay("Agentic AI CISO Discovery", "Enterprise", "SailPoint Agent Identity Security (AIS)", "intermediate"),
  roleplay("Machine Identity Security Workshop", "Enterprise", "SailPoint Machine Identity Security", "intermediate"),
  roleplay("Agentic Fabric Competitive Positioning", "Enterprise", "SailPoint Agentic Fabric", "advanced"),
  roleplay("ISC Workflow Automation ROI", "SLED", "Identity Security Cloud Workflows", "foundational"),
  roleplay("Certification Campaign Executive Sponsor", "Healthcare", "Identity Security Cloud Certifications", "intermediate"),
  roleplay("IIQ to ISC Migration Planning", "Enterprise", "SailPoint IdentityIQ (IIQ)", "advanced"),
  roleplay("Non-Employee Risk Manager Call", "SLED", "SailPoint Non-Employee Risk Management", "intermediate"),
  roleplay("Zero Standing Privilege Board Brief", "FED", "SailPoint Agent Identity Security (AIS)", "advanced"),
  roleplay("MCP Governance Technical Deep-Dive", "Enterprise", "SailPoint MCP Server Governance", "advanced"),
  roleplay("Shadow AI Discovery Executive", "Enterprise", "SailPoint Agentic Fabric", "intermediate"),
  elevatorPitch(
    "Elevator Pitch — Agentic AIS (Dr. Priya Nair)",
    "Dr. Priya Nair — CISO, Regional Health System",
    "Healthcare",
    "SailPoint Agent Identity Security (AIS)",
    `Dr. Priya Nair | Chief Information Security Officer | Midwest Regional Health
Background: Board pressure on AI governance after a shadow ChatGPT incident. 14 hospitals, heavy Epic integration.
Current focus: non-human identities for clinical AI tools without slowing innovation.
Budget mindset: wants a 90-day proof point, not a 18-month IAM program pitch.
Introduce yourself in 2–3 sentences. End with: "What do you have for me?"`,
  ),
  elevatorPitch(
    "Elevator Pitch — FED Zero Trust (James Okonkwo)",
    "James Okonkwo — Agency IAM Program Lead, Federal Civilian",
    "FED",
    "SailPoint Identity Security Cloud (ISC)",
    `James Okonkwo | IAM Program Lead | Federal civilian agency
Background: FedRAMP High environment, OMB zero-trust memo deadlines.
Current focus: standing privilege reduction for admin accounts and service principals.
Budget mindset: must show compliance mapping, not feature slides.
Introduce yourself in 2–3 sentences. End with: "What do you have for me?"`,
    "foundational",
  ),
  objectionDrill(
    "Landmine: We Already Have Entra",
    "Microsoft Entra already covers our agents — why SailPoint?",
    "Enterprise",
    "SailPoint Agent Identity Security (AIS)",
  ),
  objectionDrill(
    "Landmine: Copilot Policies Are Enough",
    "Our Copilot policies handle AI — we do not need another platform.",
    "Enterprise",
    "SailPoint Agentic Fabric",
  ),
  objectionDrill(
    "Landmine: Build Our Own Agent Governance",
    "We will build agent governance in-house with our SIEM and scripts.",
    "Enterprise",
    "SailPoint Agentic Fabric",
  ),
  objectionDrill(
    "Competitive: Okta Identity Everywhere",
    "Okta says they govern agents natively now — why add SailPoint?",
    "Enterprise",
    "SailPoint Agent Identity Security (AIS)",
  ),
  roleplay("Discovery-Only — No Demo Allowed", "SLED", "SailPoint Identity Security Cloud (ISC)", "foundational"),
];
