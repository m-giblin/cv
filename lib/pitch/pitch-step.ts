/**
 * Ramp plan "Pitch: ..." steps. They are stored as content_review steps whose resource is a Pitch Studio
 * link (/practice/pitch?scenario=<id>), so the step workbench, Pitch Studio and the mentor's evidence
 * loader all use these helpers to recognise them and to describe the pitch attached to one.
 */

export const PITCH_STUDIO_PATH = "/practice/pitch";

/** Activity event written when a pitch is saved in Pitch Studio. Its metadata links it to a ramp step. */
export const PITCH_SAVED_EVENT = "pitch_practice_saved";
/** Activity event written when a free-practice pitch is shared with the mentor. */
export const PITCH_SHARED_EVENT = "pitch_shared_with_mentor";

export const PITCH_STEP_DONE_WHEN = [
  "Pitch recorded or typed in Pitch Studio",
  "Scored against the rubric",
  "Reflection on what you'd change",
];

const SCENARIO_PARAM = /[?&]scenario=([0-9a-f-]{36})/i;

export function isPitchResourceUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = url.trim();
  return path === PITCH_STUDIO_PATH || path.startsWith(`${PITCH_STUDIO_PATH}?`) || path.startsWith(`${PITCH_STUDIO_PATH}/`);
}

/** A ramp step that is done in Pitch Studio rather than read. */
export function isPitchStep(step: { type: string; resourceUrl?: string | null }): boolean {
  return step.type === "content_review" && isPitchResourceUrl(step.resourceUrl);
}

export function pitchScenarioFromUrl(url: string | null | undefined): string | null {
  return url ? (SCENARIO_PARAM.exec(url)?.[1] ?? null) : null;
}

/** Pitch Studio opened for a ramp step: the scenario plus the assignment step the saved pitch attaches to. */
export function pitchStudioHref(step: { resourceUrl?: string | null; assignmentStepId?: string }): string {
  const params = new URLSearchParams();
  const scenario = pitchScenarioFromUrl(step.resourceUrl);
  if (scenario) params.set("scenario", scenario);
  if (step.assignmentStepId) params.set("step", step.assignmentStepId);
  const query = params.toString();
  return query ? `${PITCH_STUDIO_PATH}?${query}` : PITCH_STUDIO_PATH;
}

/** One number for a scored pitch: the rounded mean of the rubric rows, or null when it wasn't scored. */
export function overallPitchScore(scores: unknown): number | null {
  if (!Array.isArray(scores)) return null;
  const values = scores
    .map((row) => (row && typeof row === "object" ? (row as { score?: unknown }).score : undefined))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function pitchWordCount(text: string | null | undefined): number {
  return text?.trim() ? text.trim().split(/\s+/).length : 0;
}

/** The first few words of a pitch, for cards and notifications. */
export function pitchSnippet(text: string | null | undefined, maxWords = 30): string {
  const words = text?.trim() ? text.trim().split(/\s+/) : [];
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/** Step notes when the SE submits from Pitch Studio: their reflection, else a line saying what they did. */
export function pitchStepNotes(input: { reflection?: string | null; score: number | null; responseMode: string }): string {
  const reflection = input.reflection?.trim();
  if (reflection) return reflection;
  const how = input.responseMode === "text" ? "Typed" : input.responseMode === "voice" ? "Recorded (voice)" : "Recorded (video)";
  return `${how} in Pitch Studio${input.score !== null ? `, AI score ${input.score}` : ", not scored yet"}.`;
}

/** The ramp step Pitch Studio was opened for. */
export type PitchStepContext = {
  assignmentStepId: string;
  title: string;
  status: string;
};

/** What the step workbench shows for the pitch attached to a step. */
export type AttachedPitch = {
  id: string;
  createdAt: string;
  responseMode: string;
  score: number | null;
  words: number;
  snippet: string;
  coachingNote: string | null;
  submitted: boolean;
};

/** Pull the ramp-step link out of a pitch_practice_saved activity row's metadata. */
export function readPitchSavedMetadata(metadata: unknown): {
  practiceSessionId: string | null;
  assignmentStepId: string | null;
  score: number | null;
  coachingNote: string | null;
  submitted: boolean;
} {
  const value = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : {};
  const text = (key: string) => (typeof value[key] === "string" && (value[key] as string).trim() ? (value[key] as string) : null);
  return {
    practiceSessionId: text("practiceSessionId"),
    assignmentStepId: text("assignmentStepId"),
    score: typeof value.score === "number" ? value.score : null,
    coachingNote: text("coachingNote"),
    submitted: value.submitted === true,
  };
}

/** The Practice hub's Pitch tile line. Typed and saved pitches count, not just recordings. */
export function pitchTileSummary(count: number, lastDate: string | null): string {
  if (count <= 0) return "No pitches yet";
  const saved = count === 1 ? "1 pitch saved" : `${count} pitches saved`;
  return lastDate ? `${saved}, last ${lastDate}` : saved;
}
