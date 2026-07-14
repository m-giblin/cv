import type { CoachingCard, Profile } from "@/lib/types";
import { uniqueProfiles } from "@/lib/utils";

export type LeaderboardEntry = {
  profileId: string;
  fullName: string;
  points: number;
  trophies: number;
  streakWeeks: number;
  avgSimScore: number | null;
  rank: number;
};

function weekKey(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
}

function practiceStreakWeeks(cards: CoachingCard[]) {
  const weeks = new Set(
    cards
      .filter((c) => !c.isPractice)
      .map((c) => weekKey(new Date(c.sentToManagerAt))),
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - cursor.getDay());

  while (weeks.has(weekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

export function buildTeamLeaderboard(params: {
  org: Profile[];
  coachingCards: CoachingCard[];
  reviewedChallengeCountByUser: Record<string, number>;
  reviewedSimCountByUser: Record<string, number>;
}): LeaderboardEntry[] {
  const rows = uniqueProfiles(params.org).map((profile) => {
    const cards = params.coachingCards.filter((c) => c.userId === profile.id && !c.isPractice);
    const trophies =
      (params.reviewedChallengeCountByUser[profile.id] ?? 0) +
      (params.reviewedSimCountByUser[profile.id] ?? 0);
    const avgSimScore =
      cards.length > 0
        ? Math.round((cards.reduce((sum, c) => sum + c.score, 0) / cards.length) * 10) / 10
        : null;
    const streakWeeks = practiceStreakWeeks(cards);
    const points = trophies * 25 + (avgSimScore ?? 0) * 10 + streakWeeks * 15;

    return {
      profileId: profile.id,
      fullName: profile.fullName,
      points: Math.round(points),
      trophies,
      streakWeeks,
      avgSimScore,
      rank: 0,
    };
  });

  rows.sort((a, b) => b.points - a.points);
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}
