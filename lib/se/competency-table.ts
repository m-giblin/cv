import { CANONICAL_COMPETENCIES, resolveCanonicalCompetency } from "@/lib/competencies/canonical";
import type { Challenge, ChallengeSubmission, CoachingCard } from "@/lib/types";

/**
 * Readiness › Competencies table. One row per canonical competency with evidence, scored from
 * the SE's own sims (coaching cards) and reviewed challenges — the same signals and the same
 * challenge score mapping (AI score, else manager grade × 20) the manager Readiness Map uses.
 */

export const READINESS_TARGET = 70;
const RECENT_SIGNALS = 7;
const WINDOW_MS = 28 * 86_400_000;

export type CompetencyStatus = "needs_practice" | "close" | "on_track";

export type CompetencyRow = {
  name: string;
  score: number;
  /** Change between the last 4 weeks and the evidence before it; null when either side is empty. */
  delta: number | null;
  evidence: number;
  status: CompetencyStatus;
  suggestion: { label: string; href: string } | null;
};

type Signal = { competency: string; score: number; at: number };

export function competencyStatus(score: number): CompetencyStatus {
  if (score < 60) return "needs_practice";
  if (score < READINESS_TARGET) return "close";
  return "on_track";
}

/** One suggested practice per competency. */
export function suggestedPractice(competency: string): { label: string; href: string } {
  const key = competency.toLowerCase();
  if (key.includes("objection")) return { label: "Objection sim", href: "/practice/simulations" };
  if (key.includes("competitive")) return { label: "Market Pulse quiz", href: "/practice/quizzes" };
  if (key.includes("demo")) return { label: "Record a pitch", href: "/practice/pitch" };
  if (key.includes("discovery")) return { label: "Discovery sim", href: "/practice/simulations" };
  if (key.includes("agentic") || key.includes("governance")) return { label: "Learning path", href: "/learn" };
  if (key.includes("sled")) return { label: "SLED playbook", href: "/learn" };
  return { label: "Hands-on challenge", href: "/practice/challenges" };
}

export function buildCompetencyRows(input: {
  userId: string;
  coachingCards: CoachingCard[];
  submissions: ChallengeSubmission[];
  challenges: Challenge[];
  now?: Date;
}): CompetencyRow[] {
  const now = (input.now ?? new Date()).getTime();
  const signals: Signal[] = [];

  for (const card of input.coachingCards) {
    if (card.userId !== input.userId || card.isPractice) continue;
    const at = new Date(card.sentToManagerAt).getTime();
    const seen = new Set<string>();
    for (const raw of card.linkedCompetencies) {
      const competency = resolveCanonicalCompetency(raw);
      if (!competency || seen.has(competency)) continue;
      seen.add(competency);
      signals.push({ competency, score: card.score, at });
    }
  }

  for (const submission of input.submissions) {
    if (submission.userId !== input.userId || submission.status !== "reviewed") continue;
    const score =
      submission.aiSuggestedScore ?? (submission.managerGrade != null ? submission.managerGrade * 20 : null);
    if (score === null) continue;
    const challenge = input.challenges.find((item) => item.id === submission.challengeId);
    const at = new Date(submission.reviewedAt ?? submission.submittedAt ?? 0).getTime();
    const seen = new Set<string>();
    for (const raw of challenge?.competencyNames ?? []) {
      const competency = resolveCanonicalCompetency(raw);
      if (!competency || seen.has(competency)) continue;
      seen.add(competency);
      signals.push({ competency, score, at });
    }
  }

  const avg = (values: number[]) => Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);

  const rows: CompetencyRow[] = [];
  for (const name of CANONICAL_COMPETENCIES) {
    const mine = signals.filter((signal) => signal.competency === name).sort((a, b) => b.at - a.at);
    if (mine.length === 0) continue;
    const score = avg(mine.slice(0, RECENT_SIGNALS).map((signal) => signal.score));
    const recent = mine.filter((signal) => now - signal.at <= WINDOW_MS);
    const older = mine.filter((signal) => now - signal.at > WINDOW_MS);
    const delta =
      recent.length > 0 && older.length > 0
        ? avg(recent.map((s) => s.score)) - avg(older.slice(0, RECENT_SIGNALS).map((s) => s.score))
        : null;
    const status = competencyStatus(score);
    rows.push({
      name,
      score,
      delta,
      evidence: mine.length,
      status,
      suggestion: suggestedPractice(name),
    });
  }

  // Strongest first, as in the v3 artboard; the gap banner picks out the weakest.
  return rows.sort((a, b) => b.score - a.score);
}
