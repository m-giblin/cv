import {
  buildChallengeCompletionBadge,
  buildSimulationCompletionBadge,
  type CompletionBadge,
} from "@/lib/account/completion-badges";
import type { DashboardData } from "@/lib/types";

export type AccountBadge = {
  id: string;
  kind: "milestone" | "challenge" | "simulation";
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: string | null;
  emoji?: string;
  funTitle?: string;
  subtitle?: string;
  tone: "gold" | "blue" | "magenta" | "green" | "purple";
};

export function computeCompletionBadges(data: DashboardData): CompletionBadge[] {
  const userId = data.currentUser.id;

  const challengeBadges = data.submissions
    .filter((submission) => submission.userId === userId && submission.status === "reviewed" && submission.reviewedAt)
    .map((submission) => {
      const challenge = data.challenges.find((item) => item.id === submission.challengeId);
      if (!challenge) return null;
      return buildChallengeCompletionBadge(submission.id, challenge, submission.reviewedAt!);
    })
    .filter((badge): badge is CompletionBadge => badge !== null);

  const simulationBadges = data.coachingCards
    .filter(
      (card) =>
        card.userId === userId &&
        !card.isPractice &&
        card.managerReviewStatus === "reviewed" &&
        card.reviewedAt,
    )
    .map((card) => {
      const assignment = data.simulations.find((sim) => sim.id === card.simulationAssignmentId);
      return buildSimulationCompletionBadge(card, assignment, card.reviewedAt!);
    });

  return [...challengeBadges, ...simulationBadges].sort(
    (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime(),
  );
}

export function computeMilestoneBadges(
  data: DashboardData,
  approvedCertCount: number,
): AccountBadge[] {
  const userId = data.currentUser.id;
  const plan = data.plans.find((item) => item.userId === userId);
  const planComplete =
    plan !== undefined &&
    (plan.progress >= 100 ||
      (plan.steps.length > 0 && plan.steps.every((step) => step.status === "reviewed")));

  const approvedSimulations = data.coachingCards.filter(
    (card) => card.userId === userId && !card.isPractice && card.managerReviewStatus === "reviewed",
  ).length;

  const practiceRounds = data.coachingCards.filter(
    (card) => card.userId === userId && card.isPractice,
  ).length;

  const approvedChallenges = data.submissions.filter(
    (submission) => submission.userId === userId && submission.status === "reviewed",
  ).length;

  return [
    {
      id: "onboarding",
      kind: "milestone",
      title: "SailPoint Onboarding",
      emoji: "🚀",
      funTitle: "Ramp Complete",
      description: planComplete
        ? "Completed your onboarding plan — cleared for the field."
        : plan
          ? `${plan.progress}% through onboarding — finish validated plan steps to earn this badge.`
          : "Complete your assigned onboarding plan to earn this badge.",
      earned: planComplete,
      tone: "gold",
    },
    {
      id: "field-ready",
      kind: "milestone",
      title: "Field Readiness",
      emoji: "📜",
      funTitle: "Certified & Cleared",
      description:
        approvedCertCount >= 5
          ? "All five certification gates cleared."
          : `${approvedCertCount} of 5 certification gates cleared.`,
      earned: approvedCertCount >= 5,
      tone: "magenta",
    },
    {
      id: "first-win",
      kind: "milestone",
      title: "First Victory",
      emoji: "⭐",
      funTitle: "On the Board",
      description:
        approvedChallenges + approvedSimulations > 0
          ? `${approvedChallenges + approvedSimulations} manager-approved win${approvedChallenges + approvedSimulations === 1 ? "" : "s"} on the board.`
          : practiceRounds > 0
            ? `${practiceRounds} practice round${practiceRounds === 1 ? "" : "s"} logged — submit for review to earn trophies.`
            : "Complete a challenge or simulation and get manager approval.",
      earned: approvedChallenges + approvedSimulations > 0,
      tone: "green",
    },
  ];
}

export function computeAccountBadges(
  data: DashboardData,
  approvedCertCount: number,
): { milestones: AccountBadge[]; trophies: CompletionBadge[] } {
  return {
    milestones: computeMilestoneBadges(data, approvedCertCount),
    trophies: computeCompletionBadges(data),
  };
}
