import { CERT_LABELS } from "@/lib/growth/career-readiness";
import type { CertificationRecord } from "@/lib/data/get-certifications-data";
import type { CoachingCard, DashboardData, Profile } from "@/lib/types";

export type TeamReadinessRow = {
  profileId: string;
  fullName: string;
  level: string;
  readinessIndex: number;
  simAvg: number | null;
  certProgress: number;
  openReviews: number;
  competencyScores: Record<string, number>;
  trend: "up" | "flat" | "down";
};

export type CompetencyHeatmapCell = {
  profileId: string;
  competency: string;
  score: number;
  sampleSize: number;
};

const CORE_COMPETENCIES = [
  "Discovery",
  "Executive Demo Storytelling",
  "Objection Handling",
  "ISC Workflows",
  "Governance",
  "Agentic AI",
];

function avg(nums: number[]) {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function certProgressForUser(certs: Pick<CertificationRecord, "status">[]) {
  const approved = certs.filter((c) => c.status === "approved").length;
  return Math.round((approved / 5) * 100);
}

function competencyScoresFromCards(cards: CoachingCard[]): Record<string, number> {
  const buckets: Record<string, number[]> = {};

  for (const card of cards) {
    for (const competency of card.linkedCompetencies) {
      const key = competency.trim();
      if (!key) continue;
      buckets[key] ??= [];
      buckets[key].push(card.score);
    }
  }

  const scores: Record<string, number> = {};
  for (const [key, values] of Object.entries(buckets)) {
    scores[key] = avg(values) ?? 0;
  }

  return scores;
}

export function buildTeamReadiness(
  org: Profile[],
  data: Pick<DashboardData, "coachingCards" | "submissions" | "simulations">,
  certsByUser: Record<string, Pick<CertificationRecord, "status">[]>,
  openReviewsByUser: Record<string, number>,
): TeamReadinessRow[] {
  return org.map((profile) => {
    const cards = data.coachingCards
      .filter((c) => c.userId === profile.id && !c.isPractice)
      .sort((a, b) => new Date(b.sentToManagerAt).getTime() - new Date(a.sentToManagerAt).getTime());

    const recent = cards.slice(0, 5).map((c) => c.score);
    const prior = cards.slice(5, 10).map((c) => c.score);
    const simAvg = avg(recent);
    const priorAvg = avg(prior);

    const certProgress = certProgressForUser(certsByUser[profile.id] ?? []);
    const competencyScores = competencyScoresFromCards(cards);

    const reviewedCount = data.submissions.filter(
      (s) => s.userId === profile.id && s.status === "reviewed",
    ).length;

    const readinessIndex = Math.min(
      100,
      Math.round(
        (simAvg ?? 50) * 0.45 +
          certProgress * 0.35 +
          Math.min(reviewedCount * 8, 20) +
          (cards.filter((c) => c.managerReviewStatus === "reviewed").length > 0 ? 10 : 0),
      ),
    );

    let trend: TeamReadinessRow["trend"] = "flat";
    if (simAvg !== null && priorAvg !== null) {
      if (simAvg > priorAvg + 3) trend = "up";
      else if (simAvg < priorAvg - 3) trend = "down";
    }

    return {
      profileId: profile.id,
      fullName: profile.fullName,
      level: profile.level,
      readinessIndex,
      simAvg,
      certProgress,
      openReviews: openReviewsByUser[profile.id] ?? 0,
      competencyScores,
      trend,
    };
  });
}

export function buildCompetencyHeatmap(rows: TeamReadinessRow[]): CompetencyHeatmapCell[] {
  const cells: CompetencyHeatmapCell[] = [];

  for (const row of rows) {
    for (const competency of CORE_COMPETENCIES) {
      const matched = Object.entries(row.competencyScores).find(([key]) =>
        key.toLowerCase().includes(competency.toLowerCase().split(" ")[0] ?? ""),
      );
      cells.push({
        profileId: row.profileId,
        competency,
        score: matched?.[1] ?? 0,
        sampleSize: matched ? 1 : 0,
      });
    }
  }

  return cells;
}

export function certLabel(type: string) {
  return CERT_LABELS[type as keyof typeof CERT_LABELS] ?? type.replaceAll("_", " ");
}
