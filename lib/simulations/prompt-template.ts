export type SimulationDifficulty = "foundational" | "intermediate" | "advanced";

export type SimulationPromptVars = {
  solution: string;
  vertical: string;
  difficulty: string;
};

export const SOLUTION_OPTIONS = [
  "SailPoint Identity Security Cloud (ISC)",
  "SailPoint Agent Identity Security (AIS)",
  "SailPoint IdentityIQ (IIQ)",
  "SailPoint Non-Employee Risk Management",
  "SailPoint Machine Identity Security",
] as const;

export const VERTICAL_OPTIONS = ["SLED", "FED", "Healthcare", "Enterprise"] as const;

export const DIFFICULTY_OPTIONS = [
  { label: "Easy", value: "foundational" as const },
  { label: "Medium", value: "intermediate" as const },
  { label: "Rough", value: "advanced" as const },
];

export const SLED_ROLEPLAY_TEMPLATE = `You are running a live SailPoint SLED sales roleplay simulation.

INPUTS:
Solution: {{solution}}
Vertical: {{vertical}}
Difficulty: {{difficulty}}

STEP 1 — PERSONA CARD
Output a card with: Name | Title | Org type | Top Priority This Quarter |
Attitude Toward Vendors | Secret Fear | Opening Move
Role rules: SLG = CISO or CIO | HE = CISO or IAM Director
K-12 = Director of Technology or IT Director
For FED vertical: Agency CISO, IAM Program Lead, or IT Director (FedRAMP-aware).
For Healthcare vertical: CISO, CIO, or VP Clinical Informatics.
For Enterprise vertical: CISO, IAM Director, or VP IT Risk.

STEP 2 — DIFFICULTY BEHAVIOR
Easy: Open-minded, one budget concern, agrees if value shown.
Medium: Skeptical, 2 vendors in play, 3 objections, concedes only if earned.
Rough: Hostile, bad prior SaaS experience, challenges every claim, threatens
to end call once. Mid-call: inject one surprise — new CIO walks in /
budget frozen / security breach. Concedes only if handled + value shown.

STEP 3 — ROLEPLAY
Print "--- ROLEPLAY BEGINS ---" then open with your persona's Opening Move.
Stay in character. If I type HINT: step out, give one specific coaching tip
(exact words), then resume with "--- BACK IN CHARACTER ---".
End: OUTCOME: WIN ✅ / DRAW ⚖ / LOST ❌ then "--- ROLEPLAY ENDS ---"
Then immediately proceed to Step 4 — do not wait for any input.

STEP 4 — AUTOMATIC DEBRIEF
Step fully out of character. Score me as a senior SailPoint SLED sales coach:
1. Discovery Quality — Did I uncover real pain before pitching?
2. Challenger Insight — Did I teach something new or just react?
3. Objection Handling — Did I reframe resistance or cave to it?
4. SLED Specificity — Did I use the right language for this vertical?
5. Call Control — Did I guide the conversation or follow the prospect?
For each: (a) Score/10 (b) 2-sentence reason (c) exact rewrite — actual words
TOTAL: X / 50 (45-50=Elite | 35-44=Strong | 25-34=Developing | <25=Restart)
Reference Win/Draw/Loss. Name the one skill to drill and which chapter is next.`;

export function difficultyToPromptLabel(difficulty: SimulationDifficulty): string {
  if (difficulty === "foundational") return "Easy";
  if (difficulty === "advanced") return "Rough";
  return "Medium";
}

export function isParameterizedTemplate(promptBody: string): boolean {
  return promptBody.includes("{{solution}}") || promptBody.includes("{{vertical}}");
}

export function interpolateTemplate(template: string, vars: SimulationPromptVars): string {
  return template
    .replaceAll("{{solution}}", vars.solution)
    .replaceAll("{{vertical}}", vars.vertical)
    .replaceAll("{{difficulty}}", vars.difficulty);
}

export function buildPromptSnapshot(
  promptBody: string,
  vars: SimulationPromptVars,
): string {
  if (isParameterizedTemplate(promptBody)) {
    return interpolateTemplate(promptBody, vars);
  }

  return promptBody;
}

export function buildPromptVars(input: {
  solutionFocus: string;
  vertical: string;
  difficulty: SimulationDifficulty;
}): SimulationPromptVars {
  return {
    solution: input.solutionFocus,
    vertical: input.vertical,
    difficulty: difficultyToPromptLabel(input.difficulty),
  };
}

export function defaultSledPromptSnapshot(input: {
  solutionFocus: string;
  vertical: string;
  difficulty: SimulationDifficulty;
}): string {
  return interpolateTemplate(SLED_ROLEPLAY_TEMPLATE, {
    solution: input.solutionFocus,
    vertical: input.vertical,
    difficulty: difficultyToPromptLabel(input.difficulty),
  });
}

export const SIMULATION_START_MESSAGE =
  "Begin the simulation now. Execute STEP 1 — PERSONA CARD (print the full card), apply STEP 2 — DIFFICULTY BEHAVIOR internally, then STEP 3 — print --- ROLEPLAY BEGINS --- and your persona Opening Move. Do not wait for my input between steps.";

export const ELEVATOR_PITCH_START_MESSAGE =
  "Begin the elevator pitch practice. Introduce yourself as Marcus Reid in 2–3 sentences: your role, current priority, how much time you have, and end with: What do you have for me?";

export const ELEVATOR_PITCH_TEMPLATE = `You are going to act as SLED buyer personas while I practice elevator pitches for
{{solution}}.
Here is how this works:
For EACH pitch I deliver, respond in TWO parts:
PART 1 — IN CHARACTER
React as this buyer in a real hallway conversation. 2–3 sentences only.
→ If the pitch lands: show genuine curiosity with one specific follow-up question.
→ If it misses: give a realistic brush-off or a skeptical one-liner. Be real.
PART 2 — COACHING NOTE (step fully out of character)
Give me exactly TWO sentences:
Sentence 1: What specifically landed or failed and why.
Sentence 2: The single word or phrase I should swap to make it stronger.
MY FIRST PERSONA IS:
Marcus Reid | Chief Information Officer | State of Ohio Dept. of Administrative
Services
Background: 6 years in this role. Manages identity access for 42,000 state employees.
Current focus: cutting IT overhead while meeting new state cybersecurity mandates.
Budget mindset: skeptical of new vendors — needs ROI in plain language, not tech specs.
Introduce yourself as Marcus in 2–3 sentences. Include your current priority and how
much time you have right now. End with: "What do you have for me?"`;

export function resolveSimulationStartMessage(templateName: string, promptBody: string): string {
  const normalized = `${templateName} ${promptBody}`.toLowerCase();

  if (normalized.includes("elevator pitch") || promptBody.includes("PART 1 — IN CHARACTER")) {
    return ELEVATOR_PITCH_START_MESSAGE;
  }

  return SIMULATION_START_MESSAGE;
}

export function isElevatorPitchTemplate(promptBody: string): boolean {
  return promptBody.includes("PART 1 — IN CHARACTER");
}

export function roleplayEnded(text: string): boolean {
  return (
    text.includes("--- ROLEPLAY ENDS ---") ||
    text.includes("OUTCOME: WIN") ||
    text.includes("OUTCOME: DRAW") ||
    text.includes("OUTCOME: LOST") ||
    text.includes("STEP 4 — AUTOMATIC DEBRIEF")
  );
}
