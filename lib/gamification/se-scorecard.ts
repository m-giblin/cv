import type { LeaderboardEntry } from "@/lib/gamification/leaderboard";
import { buildTeamLeaderboard } from "@/lib/gamification/leaderboard";
import type { CoachingCard, Profile } from "@/lib/types";

export type SeScorecard = {
  points: number;
  rank: number;
  teamSize: number;
  streakWeeks: number;
  trophies: number;
  avgSimScore: number | null;
  level: "Rookie" | "Contributor" | "Operator" | "Ace" | "Elite";
  nextMilestone: string;
  pointsToNext: number;
  breakdown: Array<{ label: string; points: number }>;
};

function levelFromPoints(points: number): SeScorecard["level"] {
  if (points >= 400) return "Elite";
  if (points >= 280) return "Ace";
  if (points >= 180) return "Operator";
  if (points >= 80) return "Contributor";
  return "Rookie";
}

function nextMilestone(points: number) {
  const thresholds = [
    { at: 80, label: "Contributor" },
    { at: 180, label: "Operator" },
    { at: 280, label: "Ace" },
    { at: 400, label: "Elite" },
  ];
  const next = thresholds.find((t) => points < t.at);
  if (!next) return { label: "Elite — top tier", toNext: 0 };
  return { label: next.label, toNext: next.at - points };
}

export function buildSeScorecard(params: {
  profileId: string;
  org: Profile[];
  coachingCards: CoachingCard[];
  reviewedChallengeCountByUser: Record<string, number>;
  reviewedSimCountByUser: Record<string, number>;
  reviewedPitchCountByUser?: Record<string, number>;
  flightCheckScoresByUser?: Record<string, number>;
  pulseScoresByUser?: Record<string, number>;
}): SeScorecard {
  const leaderboard = buildTeamLeaderboard({
    org: params.org,
    coachingCards: params.coachingCards,
    reviewedChallengeCountByUser: params.reviewedChallengeCountByUser,
    reviewedSimCountByUser: params.reviewedSimCountByUser,
  });

  const entry = leaderboard.find((row) => row.profileId === params.profileId);
  const pitchBonus = (params.reviewedPitchCountByUser?.[params.profileId] ?? 0) * 20;
  const flightBonus = Math.round((params.flightCheckScoresByUser?.[params.profileId] ?? 0) * 0.3);
  const pulseBonus = (params.pulseScoresByUser?.[params.profileId] ?? 0) * 5;
  const points = (entry?.points ?? 0) + pitchBonus + flightBonus + pulseBonus;

  const breakdown = [
    { label: "Trophies & reviews", points: entry?.points ?? 0 },
    { label: "Pitch excellence", points: pitchBonus },
    { label: "Flight Check signal", points: flightBonus },
    { label: "Market pulse", points: pulseBonus },
  ].filter((row) => row.points > 0);

  const milestone = nextMilestone(points);

  return {
    points,
    rank: entry?.rank ?? params.org.length,
    teamSize: params.org.length,
    streakWeeks: entry?.streakWeeks ?? 0,
    trophies: entry?.trophies ?? 0,
    avgSimScore: entry?.avgSimScore ?? null,
    level: levelFromPoints(points),
    nextMilestone: milestone.label,
    pointsToNext: milestone.toNext,
    breakdown,
  };
}

export function leaderboardWithExtendedPoints(
  base: LeaderboardEntry[],
  pitchCounts: Record<string, number>,
  flightScores: Record<string, number>,
): LeaderboardEntry[] {
  const adjusted = base.map((row) => {
    const extra = (pitchCounts[row.profileId] ?? 0) * 20 + Math.round((flightScores[row.profileId] ?? 0) * 0.3);
    return { ...row, points: row.points + extra };
  });
  adjusted.sort((a, b) => b.points - a.points);
  return adjusted.map((row, index) => ({ ...row, rank: index + 1 }));
}
