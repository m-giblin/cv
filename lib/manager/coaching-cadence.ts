import type { CoachingCard, Profile } from "@/lib/types";
import { uniqueProfiles } from "@/lib/utils";

export type CoachingCadenceRow = {
  profileId: string;
  fullName: string;
  daysSinceCoaching: number | null;
  openReviews: number;
  readinessIndex: number;
  priority: "urgent" | "attention" | "healthy";
  lastCoachedAt: string | null;
};

export function buildCoachingCadence(
  org: Profile[],
  coachingCards: CoachingCard[],
  openReviewsByUser: Record<string, number>,
  readinessByUser: Record<string, number>,
): CoachingCadenceRow[] {
  const now = Date.now();

  const team = uniqueProfiles(org);

  return team.map((profile) => {
    const reviewed = coachingCards
      .filter((c) => c.userId === profile.id && c.managerReviewStatus === "reviewed" && !c.isPractice)
      .sort((a, b) => b.sentToManagerAt.localeCompare(a.sentToManagerAt));

    const last = reviewed[0];
    const daysSinceCoaching = last
      ? Math.floor((now - new Date(last.sentToManagerAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const openReviews = openReviewsByUser[profile.id] ?? 0;
    const readinessIndex = readinessByUser[profile.id] ?? 0;

    let priority: CoachingCadenceRow["priority"] = "healthy";
    if (openReviews > 0 || (daysSinceCoaching !== null && daysSinceCoaching > 21)) {
      priority = "urgent";
    } else if (daysSinceCoaching === null || daysSinceCoaching > 14 || readinessIndex < 55) {
      priority = "attention";
    }

    return {
      profileId: profile.id,
      fullName: profile.fullName,
      daysSinceCoaching,
      openReviews,
      readinessIndex,
      priority,
      lastCoachedAt: last?.sentToManagerAt ?? null,
    };
  }).sort((a, b) => {
    const priorityOrder = { urgent: 0, attention: 1, healthy: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return (b.daysSinceCoaching ?? 999) - (a.daysSinceCoaching ?? 999);
  });
}
