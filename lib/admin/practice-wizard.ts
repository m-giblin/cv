/**
 * New practice wizard (handoff STRUCTURE §16, Practice Wizard.dc.html): state, presets, validation,
 * and the mapping to the existing create APIs. UI lives in components/admin/practice-wizard.tsx.
 */
import {
  DYNAMIC_PERSONA,
  PITCH_TRACKS,
  buildSimScoringBlock,
  isDynamicPersona,
  joinSimPrompt,
  parseSimPrompt,
  parseSituation,
  trackLabel,
  type PitchScenarioRow,
  type PitchTrackLabel,
  type SimTemplateRow,
} from "@/lib/admin/practice-library";

export type WizardStep = 1 | 2 | 3 | 4;
export type WizardKind = "sim" | "pitch";
export type WizardStart = "blank" | "sled" | "elevator" | "dup" | "upload";
export type Difficulty = "Foundational" | "Intermediate" | "Advanced";
export type OverrideKey = "solution" | "vertical" | "difficulty";

export const WIZARD_STEP_LABELS = ["Start", "Buyer", "Scenario", "Scoring"] as const;
export const DIFFICULTIES: Difficulty[] = ["Foundational", "Intermediate", "Advanced"];
export const PITCH_DURATIONS = [60, 90, 120] as const;
export const SIM_PASS_MARKS = ["60", "70", "75", "80"] as const;
export const PITCH_PASS_MARKS = ["3", "4", "5"] as const;
export const PRACTICE_ROUNDS = [0, 1, 2, 3] as const;
export const MAX_GOALS = 4;
export const MIN_GOALS = 2;

/** Default solution stored on new simulations; managers override it at assign when allowed. */
export const DEFAULT_SOLUTION_FOCUS = "Identity Security Cloud (ISC)";

export type WizardState = {
  step: WizardStep;
  kind: WizardKind;
  start: WizardStart;
  /** Library key of the item being duplicated, when start is "dup". */
  duplicateOf: string | null;
  persona: "dynamic" | "named";
  personaName: string;
  personaRole: string;
  difficulty: Difficulty;
  track: PitchTrackLabel;
  duration: (typeof PITCH_DURATIONS)[number];
  vertical: string;
  name: string;
  situation: string;
  goals: string[];
  overrides: Record<OverrideKey, boolean>;
  /** Hand-edited scenario text from "Edit raw prompt". null means use the generated text. */
  rawScenario: string | null;
  pass: string | null;
  rounds: number;
  competency: string | null;
  solutionFocus: string;
  /** Pitch scenario saved as an inactive draft on the server. */
  draftId: string | null;
};

export function initialWizardState(): WizardState {
  return {
    step: 1,
    kind: "sim",
    start: "blank",
    duplicateOf: null,
    persona: "dynamic",
    personaName: "",
    personaRole: "",
    difficulty: "Intermediate",
    track: "Elevator",
    duration: 90,
    vertical: "Healthcare",
    name: "",
    situation: "",
    goals: ["", ""],
    overrides: { solution: true, vertical: true, difficulty: false },
    rawScenario: null,
    pass: null,
    rounds: 1,
    competency: null,
    solutionFocus: DEFAULT_SOLUTION_FOCUS,
    draftId: null,
  };
}

/** Presets from the design: a SLED roleplay simulation and an elevator pitch. */
export function applyPreset(state: WizardState, start: "blank" | "sled" | "elevator"): WizardState {
  if (start === "sled") {
    return {
      ...state,
      start,
      duplicateOf: null,
      kind: "sim",
      persona: "dynamic",
      vertical: "SLED",
      difficulty: "Intermediate",
      name: "SLED sales roleplay",
      situation:
        "A state agency is consolidating identity across 40 departments after an audit finding. The buyer is cautious and budget-constrained.",
      goals: ["Find the audit finding behind the project", "Map who approves access today", "Agree a next step with a date"],
      rawScenario: null,
      draftId: null,
    };
  }
  if (start === "elevator") {
    return {
      ...state,
      start,
      duplicateOf: null,
      kind: "pitch",
      track: "Elevator",
      duration: 60,
      vertical: "SLED",
      name: "Elevator pitch: identity security",
      situation:
        "You meet the state CIO in a hallway. You have one minute to explain why identity security belongs on their roadmap.",
      goals: ["Name a risk the CIO already owns", "One proof point with a number", "Ask for a 30-minute meeting"],
      rawScenario: null,
      draftId: null,
    };
  }
  return { ...state, start, duplicateOf: null, name: "", situation: "", goals: ["", ""], rawScenario: null, draftId: null };
}

function toDifficulty(value: string): Difficulty {
  const lower = value.toLowerCase();
  return lower === "foundational" ? "Foundational" : lower === "advanced" ? "Advanced" : "Intermediate";
}

function padGoals(goals: string[]): string[] {
  const clean = goals.map((goal) => goal.trim()).filter(Boolean).slice(0, MAX_GOALS);
  while (clean.length < MIN_GOALS) clean.push("");
  return clean;
}

/** Pre-fills steps 2 and 3 from an existing simulation template. */
export function duplicateFromSim(state: WizardState, row: SimTemplateRow, key: string): WizardState {
  const parsed = parseSimPrompt(row.promptBody);
  const situation = parseSituation(parsed.scenario);
  const dynamic = isDynamicPersona(row.persona);
  const [personaName = "", ...roleParts] = row.persona.split(/,\s*/);
  return {
    ...state,
    start: "dup",
    duplicateOf: key,
    kind: "sim",
    persona: dynamic ? "dynamic" : "named",
    personaName: dynamic ? "" : personaName.trim(),
    personaRole: dynamic ? "" : roleParts.join(", ").trim(),
    difficulty: toDifficulty(row.difficulty),
    vertical: row.vertical,
    name: `${row.name} (copy)`,
    situation: situation ?? "",
    goals: padGoals(parsed.goals),
    overrides: {
      solution: row.promptBody.includes("{{solution}}"),
      vertical: row.promptBody.includes("{{vertical}}"),
      difficulty: row.promptBody.includes("{{difficulty}}"),
    },
    // Prompts not written by the wizard keep their text; the admin can still edit it in step 3.
    rawScenario: situation ? null : parsed.scenario,
    pass: parsed.passMark !== null && (SIM_PASS_MARKS as readonly string[]).includes(String(parsed.passMark)) ? String(parsed.passMark) : null,
    rounds: Math.min(3, Math.max(0, parsed.rounds ?? row.practiceRoundsBeforeSubmit)),
    competency: parsed.competency,
    solutionFocus: row.solutionFocus || DEFAULT_SOLUTION_FOCUS,
    draftId: null,
  };
}

/** Coaching description written for pitch scenarios: the goals as a numbered list. */
export function pitchDescription(goals: string[]): string {
  return goals
    .map((goal) => goal.trim())
    .filter(Boolean)
    .map((goal, index) => `${index + 1}. ${goal}`)
    .join("\n");
}

export function parsePitchGoals(description: string): string[] {
  const numbered = [...description.matchAll(/^\s*\d+\.\s+(.+)$/gm)].map((match) => match[1]!.trim());
  return numbered.length ? numbered : description.trim() ? [description.trim()] : [];
}

/** Pre-fills steps 2 and 3 from an existing pitch scenario. */
export function duplicateFromPitch(state: WizardState, row: PitchScenarioRow, key: string): WizardState {
  const track = PITCH_TRACKS.find((entry) => entry.toLowerCase() === row.track.toLowerCase()) ?? "Elevator";
  const duration = (PITCH_DURATIONS as readonly number[]).includes(row.maxDurationSec)
    ? (row.maxDurationSec as WizardState["duration"])
    : 90;
  return {
    ...state,
    start: "dup",
    duplicateOf: key,
    kind: "pitch",
    track,
    duration,
    name: `${row.label} (copy)`,
    situation: row.prompt,
    goals: padGoals(parsePitchGoals(row.description)),
    rawScenario: null,
    pass: (PITCH_PASS_MARKS as readonly string[]).includes(String(row.passingGrade)) ? String(row.passingGrade) : null,
    competency: row.competencies[0] ?? null,
    draftId: null,
  };
}

/** Fills the scenario from an uploaded .txt or .md file. */
export function applyUpload(state: WizardState, fileName: string, text: string): WizardState {
  const body = text.trim();
  const firstParagraph = body.split(/\n\s*\n/)[0]?.replace(/\s+/g, " ").trim() ?? "";
  const baseName = fileName.replace(/\.(txt|md)$/i, "").replace(/[-_]+/g, " ").trim();
  return {
    ...state,
    start: "upload",
    duplicateOf: null,
    name: state.name.trim() || (baseName ? baseName.charAt(0).toUpperCase() + baseName.slice(1) : ""),
    situation: state.kind === "pitch" ? body : firstParagraph.slice(0, 600),
    rawScenario: state.kind === "sim" ? body : null,
  };
}

export function filledGoals(state: Pick<WizardState, "goals">): string[] {
  return state.goals.map((goal) => goal.trim()).filter(Boolean);
}

/** Difficulty can only vary at assign when the prompt is parameterised (solution or vertical placeholder). */
export function effectiveOverrides(overrides: Record<OverrideKey, boolean>): Record<OverrideKey, boolean> {
  return { ...overrides, difficulty: overrides.difficulty && (overrides.solution || overrides.vertical) };
}

export function stepValid(state: WizardState, step: WizardStep): boolean {
  if (step === 1) return true;
  if (step === 2) {
    return state.kind === "pitch" || state.persona === "dynamic" || Boolean(state.personaName.trim() && state.personaRole.trim());
  }
  if (step === 3) {
    return state.name.trim().length >= 3 && state.situation.trim().length >= 10 && filledGoals(state).length >= MIN_GOALS;
  }
  return Boolean(state.pass && state.competency);
}

/** Sentence-case hint for the footer while the current step is invalid. */
export function stepHint(state: WizardState, step: WizardStep): string | null {
  if (stepValid(state, step)) return null;
  if (step === 2) return "Add a name and role for the persona.";
  if (step === 3) {
    const missing: string[] = [];
    if (state.name.trim().length < 3) missing.push("a name");
    if (state.situation.trim().length < 10) missing.push("a situation");
    const goals = filledGoals(state).length;
    if (goals < MIN_GOALS) missing.push(goals === 0 ? "2 goals" : "1 more goal");
    return `Add ${joinList(missing)}.`;
  }
  if (step === 4) {
    if (!state.pass && !state.competency) return "Pick a pass mark and a competency.";
    return state.pass ? "Pick a competency." : "Pick a pass mark.";
  }
  return null;
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

/** A step can be opened when it is behind the current one or every step before it is valid. */
export function canReach(state: WizardState, target: WizardStep): boolean {
  if (target <= state.step) return true;
  for (let step = 1; step < target; step += 1) {
    if (!stepValid(state, step as WizardStep)) return false;
  }
  return true;
}

export function canPublish(state: WizardState): boolean {
  return ([1, 2, 3, 4] as WizardStep[]).every((step) => stepValid(state, step));
}

export type ChecklistRow = { label: string; done: boolean };

export function publishChecklist(state: WizardState): ChecklistRow[] {
  const sim = state.kind === "sim";
  const goals = filledGoals(state).length;
  return [
    { label: sim ? "Type: simulation" : "Type: pitch scenario", done: true },
    {
      label: sim ? (state.persona === "dynamic" ? "Buyer: dynamic" : "Buyer: named persona") : `Track: ${state.track.toLowerCase()}`,
      done: stepValid(state, 2),
    },
    { label: "Name and situation", done: state.name.trim().length >= 3 && state.situation.trim().length >= 10 },
    { label: `${goals} of 2 to 4 goals`, done: goals >= MIN_GOALS },
    { label: "Pass mark set", done: Boolean(state.pass) },
    { label: "Linked to a competency", done: Boolean(state.competency) },
  ];
}

export function rubric(state: WizardState): { n: number; text: string; weight: string }[] {
  const goals = filledGoals(state);
  return goals.map((text, index) => ({ n: index + 1, text, weight: `${Math.round(100 / goals.length)}%` }));
}

export function personaValue(state: WizardState): string {
  return state.persona === "named" ? `${state.personaName.trim()}, ${state.personaRole.trim()}` : DYNAMIC_PERSONA;
}

/** Scenario text generated from steps 2 and 3, with placeholders for what managers may change. */
export function generatedScenario(state: WizardState): string {
  if (state.kind === "pitch") {
    const goals = filledGoals(state);
    return [
      `Prompt shown to the SE (${state.duration} seconds, ${state.track.toLowerCase()} track):`,
      state.situation.trim() || "…",
      "Rubric:",
      ...(goals.length ? goals.map((goal, index) => `  ${index + 1}. ${goal}`) : ["  …"]),
    ].join("\n");
  }
  const overrides = effectiveOverrides(state.overrides);
  const who = state.persona === "named" && state.personaName.trim() ? personaValue(state) : "a dynamically generated buyer";
  const goals = filledGoals(state);
  return [
    `You are ${who} in ${overrides.vertical ? "{{vertical}}" : state.vertical}.`,
    `Situation: ${state.situation.trim() || "…"}`,
    `Difficulty: ${overrides.difficulty ? "{{difficulty}}" : state.difficulty.toLowerCase()}.`,
    `Solution in focus: ${overrides.solution ? "{{solution}}" : state.solutionFocus}`,
    "Stay in character as the buyer. Answer only what the SE earns with good questions.",
    "The SE succeeds if they:",
    ...(goals.length ? goals.map((goal, index) => `  ${index + 1}. ${goal}`) : ["  …"]),
  ].join("\n");
}

export function scenarioText(state: WizardState): string {
  return state.rawScenario ?? generatedScenario(state);
}

/** Full promptBody stored on the simulation template: scenario plus the scoring block. */
export function simPromptBody(state: WizardState): string {
  return joinSimPrompt(
    scenarioText(state),
    buildSimScoringBlock({
      goals: filledGoals(state),
      passMark: Number(state.pass ?? 70),
      rounds: state.rounds,
      competency: state.competency ?? "",
    }),
  );
}

/** Body for POST /api/admin/simulation-templates. */
export function toSimPayload(state: WizardState) {
  return {
    name: state.name.trim(),
    persona: personaValue(state),
    vertical: state.vertical,
    solutionFocus: state.solutionFocus,
    difficulty: state.difficulty.toLowerCase() as "foundational" | "intermediate" | "advanced",
    practiceRoundsBeforeSubmit: state.rounds,
    promptBody: simPromptBody(state),
  };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Body for POST/PATCH /api/admin/pitch-scenarios. Slug, short label and prompt label are derived. */
export function toPitchPayload(state: WizardState, options: { active: boolean; suffix?: string }) {
  const name = state.name.trim();
  const base = slugify(name) || "pitch";
  return {
    slug: options.suffix ? `${base}-${options.suffix}` : base,
    track: state.track.toLowerCase() as "elevator" | "discovery" | "competitive" | "executive" | "governance",
    shortLabel: name.length > 32 ? `${name.slice(0, 31).trimEnd()}…` : name,
    label: name,
    promptLabel: `${trackLabel(state.track)} pitch`,
    prompt: state.situation.trim(),
    description: pitchDescription(state.goals) || "Coaching notes to come.",
    competencies: state.competency ? [state.competency] : [],
    linkedSolution: null,
    maxDurationSec: state.duration,
    active: options.active,
    passingGrade: Number(state.pass ?? 4),
  };
}

/** Whether a pitch draft has enough for the API to accept it as an inactive scenario. */
export function pitchDraftSavable(state: WizardState): boolean {
  return state.kind === "pitch" && state.name.trim().length >= 3 && state.situation.trim().length >= 10;
}

/** Copy for the live preview card. */
export function previewCopy(state: WizardState) {
  const sim = state.kind === "sim";
  const roundsText = state.rounds === 0 ? "no practice rounds" : state.rounds === 1 ? "one practice round" : `${state.rounds} practice rounds`;
  const pass = state.pass ? (sim ? `Pass at ${state.pass}` : `Pass at ${state.pass} of 5`) : "Pass mark not set";
  return {
    stub: sim ? "Sim" : "Pitch",
    numeral: sim ? "15" : String(state.duration),
    unit: sim ? "min" : "sec",
    meta: sim
      ? `Practice for ${state.vertical === "Any" ? "any vertical" : state.vertical}, ${state.difficulty.toLowerCase()}`
      : `${state.track} pitch for ${state.vertical === "Any" ? "any vertical" : state.vertical}`,
    title: state.name.trim() || (sim ? "Untitled simulation" : "Untitled pitch"),
    hasTitle: Boolean(state.name.trim()),
    body: state.situation.trim() || "The situation you write in step 3 appears here.",
    foot: sim ? `${pass}, ${roundsText}` : pass,
  };
}

export const WIZARD_DRAFT_STORAGE_KEY = "admin-practice-wizard-draft";
