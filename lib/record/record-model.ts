import type { RecordPeriod, RecordPhase, ScoreSummary } from "@/lib/record/period";
import { summarizeScores } from "@/lib/record/period";

/**
 * The Record as one timeline: every stage, sign-off, finished assignment, practice run and meeting is
 * an entry carrying its scores and everything people wrote about it, so a manager can scan the list
 * and read the whole story of any item without leaving it.
 */

export type RecordKind = "stage" | "gate" | "work" | "simulation" | "pitch" | "check" | "one_on_one" | "mentor" | "coaching";

export type RecordTone = "good" | "warn" | "bad" | "neutral";

export type RecordNote = {
  /** What the note is: "Strength", "Gap", "Next action", "Mentor's recommendation". */
  label: string;
  body: string;
  author?: string;
  at?: string;
  tone?: RecordTone;
};

export type RecordScore = { label: string; score: number | null; pass: number | null };

export type RecordEntry = {
  id: string;
  kind: RecordKind;
  /** When it happened (ISO). */
  at: string;
  title: string;
  /** One short line under the title in the list. */
  subtitle: string;
  phase: "onboarding" | "ongoing";
  /** The number or word shown on the right of the row: a score, "4/5", "Passed". */
  headline: { value: string; tone: RecordTone } | null;
  scores: RecordScore[];
  notes: RecordNote[];
  facts: { label: string; value: string }[];
  lists: { label: string; items: string[] }[];
  /** Longer text: what they said in a drill, their reflection. */
  texts: { label: string; body: string }[];
  /** The assignment behind it, whose answers and drill transcripts a manager can open over the Record. */
  open: { workId: string; workKind: "playbook" | "quiz"; label: string } | null;
};

export type RecordFollowUp = { entryId: string; body: string; author?: string; at: string };

export type RecordSummary = {
  counts: Record<RecordKind, number>;
  gates: { approved: number; sentBack: number; averageConfidence: number | null };
  practice: { simulations: ScoreSummary; pitches: ScoreSummary; checks: ScoreSummary };
  /** The scored result nearest its pass mark (or below it): the one worth a look. */
  closestCall: { entryId: string; label: string; score: number; pass: number } | null;
  followUps: RecordFollowUp[];
};

export type PersonRecord = {
  person: { id: string; name: string };
  period: RecordPeriod;
  phase: RecordPhase;
  onboarding: { start: string; end: string | null } | null;
  entries: RecordEntry[];
  summary: RecordSummary;
};

export const KIND_LABEL: Record<RecordKind, string> = {
  stage: "Stage",
  gate: "Sign-off",
  work: "Assigned work",
  simulation: "Simulation",
  pitch: "Pitch",
  check: "Knowledge check",
  one_on_one: "1:1",
  mentor: "Mentor check-in",
  coaching: "Coaching note",
};

const KINDS = Object.keys(KIND_LABEL) as RecordKind[];

/** Tone for a score: against its pass mark when there is one, otherwise the app's 60/70 bands. */
export function scoreTone(score: number | null, pass?: number | null): RecordTone {
  if (score === null) return "neutral";
  if (typeof pass === "number") return score >= pass ? (score - pass <= 5 ? "warn" : "good") : "bad";
  return score < 60 ? "bad" : score < 70 ? "warn" : "good";
}

const NEXT_ACTION = /next/i;

/** Counts, gate confidence, practice summaries, the closest call and open follow-ups for a set of entries. */
export function summarizeRecord(entries: RecordEntry[]): RecordSummary {
  const counts = Object.fromEntries(KINDS.map((kind) => [kind, 0])) as Record<RecordKind, number>;
  for (const entry of entries) counts[entry.kind] += 1;

  const gates = entries.filter((entry) => entry.kind === "gate");
  const approved = gates.filter((entry) => entry.headline?.tone !== "bad");
  const confidences = gates
    .map((entry) => entry.facts.find((fact) => fact.label === "Confidence")?.value)
    .map((value) => (value ? Number.parseInt(value, 10) : Number.NaN))
    .filter((value) => Number.isFinite(value));

  const practiceOf = (kind: RecordKind) =>
    summarizeScores(entries.filter((entry) => entry.kind === kind).map((entry) => ({ at: entry.at, score: entry.scores[0]?.score ?? null })));

  let closestCall: RecordSummary["closestCall"] = null;
  for (const entry of entries) {
    for (const score of entry.scores) {
      if (score.score === null || score.pass === null) continue;
      const margin = score.score - score.pass;
      if (!closestCall || margin < closestCall.score - closestCall.pass) {
        closestCall = { entryId: entry.id, label: `${score.label}, ${entry.title}`, score: score.score, pass: score.pass };
      }
    }
  }

  const followUps: RecordFollowUp[] = entries
    .flatMap((entry) =>
      entry.notes
        .filter((note) => NEXT_ACTION.test(note.label) && note.body.trim())
        .map((note) => ({ entryId: entry.id, body: note.body, author: note.author, at: note.at ?? entry.at })),
    )
    .sort((a, b) => b.at.localeCompare(a.at));

  return {
    counts,
    gates: {
      approved: approved.length,
      sentBack: gates.length - approved.length,
      averageConfidence: confidences.length ? Math.round((confidences.reduce((sum, value) => sum + value, 0) / confidences.length) * 10) / 10 : null,
    },
    practice: { simulations: practiceOf("simulation"), pitches: practiceOf("pitch"), checks: practiceOf("check") },
    closestCall,
    followUps,
  };
}

/** Case-insensitive match on everything a manager might remember about an item: title, notes, facts. */
export function entryMatches(entry: RecordEntry, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = [
    entry.title,
    entry.subtitle,
    KIND_LABEL[entry.kind],
    ...entry.notes.flatMap((note) => [note.label, note.body, note.author ?? ""]),
    ...entry.facts.map((fact) => `${fact.label} ${fact.value}`),
    ...entry.lists.flatMap((list) => list.items),
    ...entry.texts.map((text) => text.body),
  ]
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** Kinds the list filters by: practice kinds group under one tab. */
export type RecordFilter = "all" | "stage" | "gate" | "work" | "practice" | "meetings" | "notes";

export function entryInFilter(entry: RecordEntry, filter: RecordFilter) {
  if (filter === "all") return true;
  if (filter === "practice") return entry.kind === "simulation" || entry.kind === "pitch" || entry.kind === "check";
  if (filter === "meetings") return entry.kind === "one_on_one" || entry.kind === "mentor" || entry.kind === "coaching";
  if (filter === "notes") return entry.notes.length > 0;
  return entry.kind === filter;
}

/** Entries grouped by the reader's calendar day, newest day first, keeping each day's order. */
export function groupByDay<T extends { at: string }>(entries: T[], dayOf: (iso: string) => string = (iso) => iso.slice(0, 10)) {
  const groups: { day: string; entries: T[] }[] = [];
  for (const entry of [...entries].sort((a, b) => b.at.localeCompare(a.at))) {
    const day = dayOf(entry.at);
    const last = groups.at(-1);
    if (last && last.day === day) last.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  }
  return groups;
}
