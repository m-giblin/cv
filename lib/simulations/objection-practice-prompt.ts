import type { SimulationDifficulty } from "@/lib/simulations/prompt-template";
import { resolveSimulationStartMessage } from "@/lib/simulations/prompt-template";
import type { SimulationAssignment } from "@/lib/types";

export function buildObjectionPracticePrompt(input: {
  objection: string;
  accountName: string;
  industry: string;
  vertical: string;
  solutionFocus: string;
  difficulty: SimulationDifficulty;
}): string {
  return `You are running a focused SailPoint sales objection-handling roleplay.

CONTEXT FROM DEAL PREP:
Account: ${input.accountName}
Industry: ${input.industry}
Vertical: ${input.vertical}
Solution in scope: ${input.solutionFocus}
Difficulty: ${input.difficulty}

PRIMARY OBJECTION TO PRACTICE:
"${input.objection}"

RULES:
- Stay in character as a skeptical buyer who raises this objection early in the call.
- Push back realistically for ${input.difficulty} difficulty.
- If the SE types HINT:, give one specific coaching tip with exact words, then resume in character.
- After 4–6 exchanges, end with OUTCOME: WIN ✅ / DRAW ⚖ / LOST ❌ and a 3-bullet debrief on objection handling.

Open with your persona's first line that naturally leads to the primary objection.`;
}

export function resolveVerticalFromIndustry(industry: string): string {
  const normalized = industry.toLowerCase();
  if (normalized.includes("sled") || normalized.includes("state") || normalized.includes("local")) {
    return "SLED";
  }
  if (normalized.includes("fed") || normalized.includes("federal")) {
    return "FED";
  }
  if (normalized.includes("health")) {
    return "Healthcare";
  }
  return "Enterprise";
}

export function createObjectionPracticeAssignment(input: {
  userId: string;
  objection: string;
  accountName: string;
  industry: string;
  solutionFocus: string;
  difficulty?: SimulationDifficulty;
}): SimulationAssignment {
  const vertical = resolveVerticalFromIndustry(input.industry);
  const difficulty = input.difficulty ?? "intermediate";
  const solutionFocus = input.solutionFocus;
  const promptSnapshot = buildObjectionPracticePrompt({
    objection: input.objection,
    accountName: input.accountName,
    industry: input.industry,
    vertical,
    solutionFocus,
    difficulty,
  });
  const label = `Objection practice — ${input.accountName}`;

  return {
    id: `practice-objection-${Date.now()}`,
    assignedTo: input.userId,
    assignedBy: input.userId,
    persona: "Skeptical buyer (objection practice)",
    vertical,
    solutionFocus,
    difficulty,
    status: "not_started",
    transcript: [],
    aiRoleplay: true,
    promptSnapshot,
    startMessage: resolveSimulationStartMessage(label, promptSnapshot),
    practiceRoundsRequired: 0,
    practiceRoundsCompleted: 0,
  };
}
