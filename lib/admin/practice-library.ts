/**
 * Content › Practice library model. One list in the UI for two separate APIs:
 * simulation templates (/api/admin/simulation-templates) and pitch scenarios (/api/admin/pitch-scenarios).
 */

export type PracticeKind = "sim" | "pitch";
export type PracticeStatus = "live" | "draft";

/** Row shape returned by GET /api/admin/simulation-templates. */
export type SimTemplateRow = {
  id: string;
  name: string;
  persona: string;
  vertical: string;
  solutionFocus: string;
  difficulty: string;
  promptBody: string;
  practiceRoundsBeforeSubmit: number;
  parameterized: boolean;
  hasSolutionPlaceholder: boolean;
  updatedAt: string;
};

/** Row shape returned by GET /api/admin/pitch-scenarios. */
export type PitchScenarioRow = {
  id: string;
  slug: string;
  track: string;
  shortLabel: string;
  label: string;
  promptLabel: string;
  prompt: string;
  description: string;
  competencies: string[];
  linkedSolution: string | null;
  maxDurationSec: number;
  sortOrder: number;
  active: boolean;
  passingGrade: number;
  updatedAt?: string;
};

/** Server-computed usage, keyed by template / scenario id. */
export type PracticeUsage = {
  simPlans: Record<string, number>;
  simRuns30d: Record<string, number>;
  pitchSlots: Record<string, number>;
  pitchRuns30d: Record<string, number>;
};

export type PracticeItem = {
  key: string;
  id: string;
  kind: PracticeKind;
  name: string;
  subline: string;
  /** Replaces the subline, in the warning colour, when something needs fixing. */
  warning: string | null;
  typeLabel: string;
  usedIn: string;
  usedCount: number;
  runs30d: number;
  status: PracticeStatus;
  vertical: string;
  competencies: string[];
  /** What the SE reads in the preview. */
  summary: string;
  /** Numeral + unit for the step-card stub. */
  duration: { value: number; unit: "min" | "sec" };
  passLabel: string;
  updatedAt: string | null;
  sim?: SimTemplateRow;
  pitch?: PitchScenarioRow;
};

export const SIM_MINUTES = 15;

export const PITCH_TRACKS = ["Elevator", "Discovery", "Competitive", "Executive", "Governance"] as const;
export type PitchTrackLabel = (typeof PITCH_TRACKS)[number];

export const PRACTICE_VERTICALS = ["SLED", "Healthcare", "Higher Ed", "Financial services", "Any"] as const;

/** Used when the tenant has no competencies defined yet. */
export const FALLBACK_COMPETENCIES = [
  "Discovery",
  "Demo execution",
  "Value articulation",
  "Competitive positioning",
  "Objection handling",
];

export const DYNAMIC_PERSONA = "Dynamic (AI-generated buyer)";

const SCORING_MARKER = "\n\nSCORING\n";

/** First line of a simulation prompt that is saved for review and must not be assignable yet. */
export const SIM_DRAFT_MARKER = "STATUS: draft\n";

export function isDraftSimulationPrompt(promptBody: string): boolean {
  return promptBody.startsWith(SIM_DRAFT_MARKER);
}

export function withoutDraftMarker(promptBody: string): string {
  return isDraftSimulationPrompt(promptBody) ? promptBody.slice(SIM_DRAFT_MARKER.length) : promptBody;
}

export type SimScoring = { goals: string[]; passMark: number | null; rounds: number | null; competency: string | null };

/** The scoring block the wizard appends to every simulation prompt it writes. */
export function buildSimScoringBlock(input: { goals: string[]; passMark: number; rounds: number; competency: string }): string {
  const goals = input.goals.map((goal) => goal.trim()).filter(Boolean);
  return [
    "SCORING",
    "Score the SE from 0 to 100. Weight each goal equally:",
    ...goals.map((goal, index) => `  ${index + 1}. ${goal}`),
    `Pass mark: ${input.passMark}`,
    `Practice rounds before submitting: ${input.rounds}`,
    `Competency: ${input.competency}`,
  ].join("\n");
}

/** Joins the scenario part of a prompt with its scoring block. */
export function joinSimPrompt(scenario: string, scoring: string): string {
  return `${scenario.trim()}${SCORING_MARKER}${scoring.replace(/^SCORING\n/, "")}`;
}

/** Splits a simulation prompt into its scenario text and the scoring the wizard stored in it (if any). */
export function parseSimPrompt(promptBody: string): { scenario: string } & SimScoring {
  const body = withoutDraftMarker(promptBody);
  const at = body.indexOf(SCORING_MARKER);
  const scenario = at >= 0 ? body.slice(0, at) : body;
  const scoring = at >= 0 ? body.slice(at + SCORING_MARKER.length) : "";
  const goals = [...scoring.matchAll(/^\s+\d+\.\s+(.+)$/gm)].map((match) => match[1]!.trim());
  const pass = scoring.match(/^Pass mark:\s*(\d+)/m);
  const rounds = scoring.match(/^Practice rounds before submitting:\s*(\d+)/m);
  const competency = scoring.match(/^Competency:\s*(.+)$/m);
  return {
    scenario,
    goals,
    passMark: pass ? Number(pass[1]) : null,
    rounds: rounds ? Number(rounds[1]) : null,
    competency: competency ? competency[1]!.trim() : null,
  };
}

/** The situation line of a wizard-written scenario, if present. */
export function parseSituation(scenario: string): string | null {
  const match = scenario.match(/^Situation:\s*(.+)$/m);
  return match ? match[1]!.trim() : null;
}

/** Placeholders a manager can override when assigning. */
export function managerOverrides(promptBody: string): string[] {
  const out: string[] = [];
  if (promptBody.includes("{{solution}}")) out.push("Solution");
  if (promptBody.includes("{{vertical}}")) out.push("vertical");
  if (promptBody.includes("{{difficulty}}")) out.push("difficulty");
  return out;
}

export function isDynamicPersona(persona: string): boolean {
  return /dynamic|generated/i.test(persona);
}

/** "Marcus Reid, CIO, State of Ohio" → "Marcus Reid". */
export function personaShortName(persona: string): string {
  return persona.split(/,| — | - |\|/)[0]!.trim() || persona;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function trackLabel(track: string): string {
  const lower = track.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function simToItem(row: SimTemplateRow, usage?: PracticeUsage | null): PracticeItem {
  const parsed = parseSimPrompt(row.promptBody);
  const plans = usage?.simPlans[row.id] ?? 0;
  const buyer = isDynamicPersona(row.persona) ? "Dynamic buyer" : personaShortName(row.persona);
  const difficulty = row.difficulty.toLowerCase();
  const vertical = row.vertical;
  const rounds = parsed.rounds ?? row.practiceRoundsBeforeSubmit;
  const passLabel = [
    parsed.passMark !== null ? `Pass at ${parsed.passMark}` : "Scored 0 to 100",
    rounds === 0 ? "no practice rounds" : rounds === 1 ? "one practice round" : `${rounds} practice rounds`,
  ].join(", ");
  return {
    key: `sim-${row.id}`,
    id: row.id,
    kind: "sim",
    name: row.name,
    subline: `${buyer}, ${vertical === "SLED" ? vertical : vertical.toLowerCase()}, ${difficulty}`,
    warning: row.promptBody.trim().length < 40 ? "The prompt is very short" : null,
    typeLabel: "Simulation",
    usedIn: plans ? plural(plans, "plan") : "None yet",
    usedCount: plans,
    runs30d: usage?.simRuns30d[row.id] ?? 0,
    status: isDraftSimulationPrompt(row.promptBody) ? "draft" : "live",
    vertical,
    competencies: parsed.competency ? [parsed.competency] : [],
    summary: parseSituation(parsed.scenario) ?? `${row.persona}. ${row.solutionFocus}.`,
    duration: { value: SIM_MINUTES, unit: "min" },
    passLabel,
    updatedAt: row.updatedAt ?? null,
    sim: row,
  };
}

export function pitchToItem(row: PitchScenarioRow, usage?: PracticeUsage | null): PracticeItem {
  const slots = usage?.pitchSlots[row.id] ?? 0;
  const warning =
    row.description.trim().length < 10
      ? "Missing a coaching description"
      : row.competencies.length === 0
        ? "Not linked to a competency"
        : null;
  return {
    key: `pitch-${row.id}`,
    id: row.id,
    kind: "pitch",
    name: row.label,
    subline: `${row.maxDurationSec} seconds, pass at ${row.passingGrade} of 5`,
    warning,
    typeLabel: "Pitch",
    usedIn: slots ? plural(slots, "slot") : "None yet",
    usedCount: slots,
    runs30d: usage?.pitchRuns30d[row.id] ?? 0,
    status: row.active ? "live" : "draft",
    vertical: "Any",
    competencies: row.competencies,
    summary: row.prompt,
    duration: { value: row.maxDurationSec, unit: "sec" },
    passLabel: `Pass at ${row.passingGrade} of 5, ${trackLabel(row.track).toLowerCase()} track`,
    updatedAt: row.updatedAt ?? null,
    pitch: row,
  };
}

export type PracticeFilters = {
  type: "all" | PracticeKind;
  vertical: string;
  competency: string;
  show: "all" | PracticeStatus;
  query?: string;
};

export const DEFAULT_PRACTICE_FILTERS: PracticeFilters = { type: "all", vertical: "", competency: "", show: "all" };

/** Applies every filter except `show`, so the Show chips can count within the other filters. */
export function filterPracticeBase(items: PracticeItem[], filters: PracticeFilters): PracticeItem[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  return items.filter(
    (item) =>
      (filters.type === "all" || item.kind === filters.type) &&
      (!filters.vertical || item.vertical === filters.vertical) &&
      (!filters.competency || item.competencies.includes(filters.competency)) &&
      (!query || `${item.name} ${item.subline}`.toLowerCase().includes(query)),
  );
}

export function filterPractice(items: PracticeItem[], filters: PracticeFilters): PracticeItem[] {
  return filterPracticeBase(items, filters).filter((item) => filters.show === "all" || item.status === filters.show);
}

export function practiceStatusCounts(items: PracticeItem[]): Record<"all" | PracticeStatus, number> {
  return {
    all: items.length,
    live: items.filter((item) => item.status === "live").length,
    draft: items.filter((item) => item.status === "draft").length,
  };
}

export type PracticeSort = "used" | "name" | "edited";

export function sortPractice(items: PracticeItem[], sort: PracticeSort): PracticeItem[] {
  const copy = [...items];
  if (sort === "name") return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "edited") return copy.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  return copy.sort((a, b) => b.runs30d - a.runs30d || b.usedCount - a.usedCount || a.name.localeCompare(b.name));
}

/** "Thu, Oct 9"; the year is added only when it is not the current year. */
export function formatShortDate(value: string | null | undefined, now = new Date()): string {
  if (!value) return "Not recorded";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
