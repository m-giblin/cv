import { analyzeCompetencyGaps } from "@/lib/development/plan-utils";
import type { Challenge, DashboardData } from "@/lib/types";

export type GapChallengeRecommendation = {
  challenge: Pick<Challenge, "id" | "title" | "description" | "difficulty" | "targetLevel" | "competencyNames">;
  reason: string;
  gapCompetency: string;
  priority: number;
};

function normalizeCompetency(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function challengeMatchesCompetency(challenge: Challenge, gapName: string) {
  const gapNorm = normalizeCompetency(gapName);
  return (challenge.competencyNames ?? []).some((comp) => {
    const compNorm = normalizeCompetency(comp);
    return compNorm.includes(gapNorm) || gapNorm.includes(compNorm);
  });
}

export function recommendChallengesForGaps(
  data: Pick<DashboardData, "coachingCards" | "competencies" | "challenges">,
  userId: string,
  reviewedChallengeIds: Set<string> = new Set(),
  limit = 4,
): GapChallengeRecommendation[] {
  const gaps = analyzeCompetencyGaps(data as DashboardData, userId);
  const recommendations: GapChallengeRecommendation[] = [];

  for (const gap of gaps) {
    const matches = data.challenges.filter(
      (challenge) =>
        !reviewedChallengeIds.has(challenge.id) && challengeMatchesCompetency(challenge, gap.competencyName),
    );

    for (const challenge of matches.slice(0, 2)) {
      if (recommendations.some((r) => r.challenge.id === challenge.id)) continue;

      recommendations.push({
        challenge: {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          difficulty: challenge.difficulty,
          targetLevel: challenge.targetLevel,
          competencyNames: challenge.competencyNames,
        },
        gapCompetency: gap.competencyName,
        reason: `${gap.gapCount} coaching signal${gap.gapCount === 1 ? "" : "s"} on ${gap.competencyName}`,
        priority: gap.gapCount,
      });
    }
  }

  return recommendations.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
