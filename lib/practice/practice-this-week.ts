import { recommendChallengesForGaps } from "@/lib/challenges/gap-recommendations";
import { analyzeCompetencyGaps } from "@/lib/development/plan-utils";
import { getSpacedReinforcementItems } from "@/lib/practice/spaced-reinforcement";
import { planStepActionLabel, planStepHref } from "@/lib/utils/plan-links";
import type { DashboardData, PlanStep } from "@/lib/types";

export type PracticeWeekItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  kind: "plan" | "gap" | "reinforce" | "pulse";
};

function nextPlanStep(plan: DashboardData["plans"][0] | undefined): PlanStep | undefined {
  if (!plan) return undefined;
  return plan.steps
    .slice()
    .sort((a, b) => a.order - b.order)
    .find((step) => step.status !== "reviewed" && step.status !== "completed");
}

export function buildPracticeWeekPlan(data: DashboardData, userId: string): PracticeWeekItem[] {
  const items: PracticeWeekItem[] = [];
  const plan = data.plans.find((p) => p.userId === userId);
  const step = nextPlanStep(plan);

  if (step) {
    items.push({
      id: `plan-${step.id}`,
      title: step.title,
      description: `${planStepActionLabel(step)} · ramp priority`,
      href: planStepHref(step),
      icon: step.type === "simulation" ? "🤖" : step.type === "challenge" ? "⚡" : step.type === "deal_prep" ? "✨" : "📋",
      kind: "plan",
    });
  }

  const reviewedIds = new Set(
    data.submissions
      .filter((s) => s.userId === userId && s.status === "reviewed")
      .map((s) => s.challengeId),
  );
  const gapRec = recommendChallengesForGaps(data, userId, reviewedIds, 1)[0];
  if (gapRec) {
    items.push({
      id: `gap-${gapRec.challenge.id}`,
      title: gapRec.challenge.title,
      description: gapRec.reason,
      href: `/challenges?challenge=${gapRec.challenge.id}`,
      icon: "🎯",
      kind: "gap",
    });
  }

  const cards = data.coachingCards.filter((c) => c.userId === userId && !c.isPractice);
  for (const reinforce of getSpacedReinforcementItems(cards).slice(0, 1)) {
    items.push({
      id: `reinforce-${reinforce.competency}`,
      title: `Refresh: ${reinforce.competency}`,
      description: reinforce.label,
      href: `/simulations?focus=simulation&reinforce=${encodeURIComponent(reinforce.competency)}&autoAssign=1`,
      icon: "🔁",
      kind: "reinforce",
    });
  }

  const gaps = analyzeCompetencyGaps(data, userId);
  if (gaps.length > 0 && !items.some((i) => i.kind === "gap")) {
    items.push({
      id: "sim-gap",
      title: "Practice your top competency gap",
      description: `${gaps[0]!.competencyName} — run a focused simulation`,
      href: "/simulations?focus=simulation",
      icon: "🤖",
      kind: "gap",
    });
  }

  items.push({
    id: "pulse",
    title: "Weekly market pulse",
    description: "Stay current on Agentic Fabric & AIS",
    href: "/market-pulse",
    icon: "🧠",
    kind: "pulse",
  });

  return items.slice(0, 4);
}
