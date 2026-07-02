import type { DashboardData } from "@/lib/types";

export type AccountBadge = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  tone: "gold" | "blue" | "magenta" | "green";
};

export function computeAccountBadges(
  data: DashboardData,
  approvedCertCount: number,
): AccountBadge[] {
  const userId = data.currentUser.id;
  const plan = data.plans.find((item) => item.userId === userId);
  const planComplete =
    plan !== undefined &&
    (plan.progress >= 100 ||
      (plan.steps.length > 0 && plan.steps.every((step) => step.status === "reviewed")));

  const officialSimSubmissions = data.coachingCards.filter(
    (card) => card.userId === userId && !card.isPractice,
  ).length;

  const practiceRounds = data.coachingCards.filter(
    (card) => card.userId === userId && card.isPractice,
  ).length;

  return [
    {
      id: "onboarding",
      title: "SailPoint Onboarding",
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
      title: "Field Readiness",
      description:
        approvedCertCount >= 5
          ? "All five certification gates cleared."
          : `${approvedCertCount} of 5 certification gates cleared.`,
      earned: approvedCertCount >= 5,
      tone: "magenta",
    },
    {
      id: "simulation",
      title: "Simulation Practitioner",
      description:
        officialSimSubmissions > 0
          ? `${officialSimSubmissions} simulation${officialSimSubmissions === 1 ? "" : "s"} submitted for review.`
          : practiceRounds > 0
            ? `${practiceRounds} practice round${practiceRounds === 1 ? "" : "s"} logged — submit when ready.`
            : "Complete a simulation and submit for manager review.",
      earned: officialSimSubmissions > 0,
      tone: "blue",
    },
  ];
}
