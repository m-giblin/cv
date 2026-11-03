import { analyzeCompetencyGaps } from "@/lib/development/plan-utils";
import { FLIGHT_CHECK_BANK, type FlightCheckQuestion } from "@/lib/assessments/flight-check-questions";
import type { DashboardData } from "@/lib/types";

export type FlightCheckResponse = {
  questionId: string;
  answer: string | number;
  correct: boolean;
  competency: string;
  difficulty: number;
};

export function focusCompetenciesForUser(data: DashboardData, userId: string, limit = 3): string[] {
  const gaps = analyzeCompetencyGaps(data, userId);
  if (gaps.length > 0) {
    return gaps.slice(0, limit).map((g) => g.competencyName);
  }
  return ["Discovery", "Objection Handling", "Agentic AI"].slice(0, limit);
}

/** What the browser sees of a question: no answer key or hint until it's answered. */
export type PresentedFlightCheckQuestion = Pick<FlightCheckQuestion, "id" | "competency" | "type" | "difficulty" | "prompt" | "options">;

/**
 * The order a session shows a question's options in: `order[shown] = original index`. Seeded by the
 * session and question, so a reload shows the same order and the answer maps back without storing it,
 * while the right answer lands on a different letter from one question and person to the next.
 */
export function optionOrder(sessionId: string, questionId: string, count: number): number[] {
  // FNV-1a hash as the seed, then mulberry32 for a Fisher-Yates shuffle.
  let seed = 2166136261;
  for (const char of `${sessionId}:${questionId}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: count }, (_, index) => index);
  for (let index = count - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap]!, order[index]!];
  }
  return order;
}

export function presentQuestion(question: FlightCheckQuestion | null, sessionId: string): PresentedFlightCheckQuestion | null {
  if (!question) return null;
  const { id, competency, type, difficulty, prompt, options } = question;
  if (!options?.length) return { id, competency, type, difficulty, prompt };
  return { id, competency, type, difficulty, prompt, options: optionOrder(sessionId, id, options.length).map((index) => options[index]!) };
}

/** Maps the option a person picked, as shown, back to its index in the bank. */
export function originalOptionIndex(question: FlightCheckQuestion, sessionId: string, shownIndex: number) {
  if (!question.options?.length) return shownIndex;
  return optionOrder(sessionId, question.id, question.options.length)[shownIndex] ?? -1;
}

function normalizeCompetency(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function questionMatchesCompetency(question: FlightCheckQuestion, competency: string) {
  const q = normalizeCompetency(question.competency);
  const c = normalizeCompetency(competency);
  return q.includes(c) || c.includes(q) || q.split(" ")[0] === c.split(" ")[0];
}

export function selectNextQuestion(
  focusCompetencies: string[],
  responses: FlightCheckResponse[],
): FlightCheckQuestion | null {
  const answeredIds = new Set(responses.map((r) => r.questionId));
  const competencyIndex = responses.length % Math.max(focusCompetencies.length, 1);
  const targetCompetency = focusCompetencies[competencyIndex] ?? focusCompetencies[0]!;

  const recentCorrect = responses.slice(-2).every((r) => r.correct);
  const targetDifficulty: 1 | 2 | 3 = recentCorrect
    ? ((responses.length > 3 ? 3 : 2) as 1 | 2 | 3)
    : 1;

  const pool = FLIGHT_CHECK_BANK.filter(
    (q) =>
      !answeredIds.has(q.id) &&
      questionMatchesCompetency(q, targetCompetency) &&
      q.difficulty <= targetDifficulty,
  );

  if (pool.length > 0) {
    return pool.sort((a, b) => b.difficulty - a.difficulty)[0]!;
  }

  const fallback = FLIGHT_CHECK_BANK.find((q) => !answeredIds.has(q.id));
  return fallback ?? null;
}

export function scoreTalkTrackAnswer(question: FlightCheckQuestion, answer: string): boolean {
  const normalized = answer.toLowerCase();
  const keywords = question.idealAnswerKeywords ?? [];
  if (keywords.length === 0) return answer.trim().length >= 20;
  const hits = keywords.filter((kw) => normalized.includes(kw.toLowerCase()));
  return hits.length >= Math.min(2, keywords.length);
}

export function evaluateAnswer(question: FlightCheckQuestion, answer: string | number): boolean {
  if (question.type === "talk_track") {
    return scoreTalkTrackAnswer(question, String(answer));
  }
  return Number(answer) === question.correctIndex;
}

export function computeCompetencyScores(responses: FlightCheckResponse[]): Record<string, number> {
  const buckets: Record<string, { correct: number; total: number }> = {};

  for (const response of responses) {
    buckets[response.competency] ??= { correct: 0, total: 0 };
    buckets[response.competency]!.total += 1;
    if (response.correct) buckets[response.competency]!.correct += 1;
  }

  const scores: Record<string, number> = {};
  for (const [competency, meta] of Object.entries(buckets)) {
    scores[competency] = Math.round((meta.correct / meta.total) * 100);
  }
  return scores;
}

export function computeFieldSignalScore(responses: FlightCheckResponse[]): number {
  if (responses.length === 0) return 0;
  const weighted = responses.reduce((sum, r) => {
    const weight = r.difficulty;
    return sum + (r.correct ? weight : 0);
  }, 0);
  const maxWeight = responses.reduce((sum, r) => sum + r.difficulty, 0);
  return Math.round((weighted / maxWeight) * 100);
}

export function buildRecommendedActions(
  competencyScores: Record<string, number>,
): Array<{ label: string; href: string; reason: string }> {
  const actions: Array<{ label: string; href: string; reason: string }> = [];
  const weakest = Object.entries(competencyScores).sort((a, b) => a[1] - b[1])[0];

  if (weakest && weakest[1] < 80) {
    actions.push({
      label: `Practice ${weakest[0]}`,
      href: `/simulations?focus=simulation&reinforce=${encodeURIComponent(weakest[0])}&autoAssign=1`,
      reason: `Flight Check signal: ${weakest[1]}% on ${weakest[0]}`,
    });
  }

  actions.push({
    label: "Run a focused challenge",
    href: "/challenges",
    reason: "Hands-on proof closes knowledge gaps faster than quizzes alone.",
  });

  return actions.slice(0, 2);
}

export const FLIGHT_CHECK_QUESTION_COUNT = 6;
