import type { CoachingCard, UserPlan } from "@/lib/types";

export type ReadinessBreakdown = {
  score: number;
  planProgress: number;
  simulationAvg: number | null;
  pitchApproved: boolean;
  labSessions30d: number;
  certApprovedRatio: number;
  segmentProgress: number;
  crmFactor: number | null;
  label: "Field ready" | "On track" | "Needs coaching" | "At risk";
};

export function computeSeReadinessScore(input: {
  plan?: UserPlan | null;
  coachingCards: CoachingCard[];
  approvedCertCount: number;
  totalCertCount?: number;
  labSessions30d?: number;
  pitchApproved?: boolean;
  crmQuotaAttainment?: number | null;
}): ReadinessBreakdown {
  const planProgress = input.plan?.progress ?? 0;
  const cards = input.coachingCards.filter((c) => !c.isPractice).slice(0, 10);
  const simulationAvg =
    cards.length > 0 ? Math.round(cards.reduce((t, c) => t + c.score, 0) / cards.length) : null;

  const unlocked = input.plan?.unlockedSegmentMax ?? 1;
  const segmentProgress = Math.round((unlocked / 4) * 100);

  const totalCerts = input.totalCertCount ?? 8;
  const certApprovedRatio = totalCerts > 0 ? input.approvedCertCount / totalCerts : 0;

  const simComponent = simulationAvg !== null ? (simulationAvg / 100) * 25 : 12;
  const planComponent = (planProgress / 100) * 30;
  const segmentComponent = (segmentProgress / 100) * 15;
  const certComponent = certApprovedRatio * 15;
  const labComponent = Math.min(10, (input.labSessions30d ?? 0) * 2);
  const pitchComponent = input.pitchApproved ? 5 : 0;

  let crmFactor: number | null = null;
  if (typeof input.crmQuotaAttainment === "number") {
    crmFactor = Math.max(0, Math.min(1, input.crmQuotaAttainment));
  }

  let score = Math.round(
    planComponent + simComponent + segmentComponent + certComponent + labComponent + pitchComponent,
  );

  if (crmFactor !== null) {
    score = Math.round(score * 0.85 + crmFactor * 100 * 0.15);
  }

  score = Math.max(0, Math.min(100, score));

  let label: ReadinessBreakdown["label"] = "On track";
  if (score >= 80) label = "Field ready";
  else if (score >= 60) label = "On track";
  else if (score >= 40) label = "Needs coaching";
  else label = "At risk";

  return {
    score,
    planProgress,
    simulationAvg,
    pitchApproved: Boolean(input.pitchApproved),
    labSessions30d: input.labSessions30d ?? 0,
    certApprovedRatio,
    segmentProgress,
    crmFactor,
    label,
  };
}

export function computeTeamReadinessScores(
  userIds: string[],
  inputs: Map<string, ReadinessBreakdown>,
): { average: number; atRisk: number; fieldReady: number } {
  const scores = userIds.map((id) => inputs.get(id)?.score ?? 0);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const atRisk = scores.filter((s) => s < 40).length;
  const fieldReady = scores.filter((s) => s >= 80).length;
  return { average, atRisk, fieldReady };
}
