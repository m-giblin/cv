import { DEMO_GROWTH_PLAN, DEMO_GROWTH_PLAN_EMPTY } from "@/components/se/growth-plan/data";
import type { SeGrowthPlanData } from "@/components/se/growth-plan/types";
import { canViewUserDevelopmentPlan } from "@/lib/development/authorize";
import { fetchDevelopmentPlanForUser } from "@/lib/data/get-development-data";
import { getDashboardData } from "@/lib/data/get-dashboard-data";
import {
  buildGrowthPlanSignals,
  developmentPlanToSeGrowthPlan,
  emptySeGrowthPlan,
} from "@/lib/se/growth-plan-mapper";

export type SeGrowthPlanPayload = SeGrowthPlanData & {
  source: "demo" | "database" | "empty";
};

export async function fetchSeGrowthPlanForUser(userId: string): Promise<SeGrowthPlanPayload> {
  if (!(await canViewUserDevelopmentPlan(userId))) {
    return { ...emptySeGrowthPlan(), source: "empty" };
  }

  const { data, source: dataSource } = await getDashboardData();
  const developmentPlan = await fetchDevelopmentPlanForUser(userId);
  const userPlan = data.plans.find((plan) => plan.userId === userId) ?? null;
  const coachingCards = data.coachingCards.filter((card) => card.userId === userId);

  if (developmentPlan && developmentPlan.goals.length > 0) {
    const signals = buildGrowthPlanSignals({ userPlan, coachingCards });
    return {
      ...developmentPlanToSeGrowthPlan(developmentPlan, signals),
      source: "database",
    };
  }

  if (dataSource === "demo") {
    return { ...DEMO_GROWTH_PLAN_EMPTY, source: "demo" };
  }

  return { ...DEMO_GROWTH_PLAN_EMPTY, source: "empty" };
}
