import { GoalStatus, GoalQuarter, DevelopmentPlan, DashboardData, Profile } from "@/lib/types";

export function quarterDueDate(year: number, quarter: GoalQuarter): string {
  const dates: Record<GoalQuarter, string> = {
    Q1: `${year}-03-31`,
    Q2: `${year}-06-30`,
    Q3: `${year}-09-30`,
    Q4: `${year}-12-31`,
  };
  return dates[quarter];
}

export function currentQuarter(): GoalQuarter {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return "Q1";
  if (month <= 6) return "Q2";
  if (month <= 9) return "Q3";
  return "Q4";
}

export function buildQuarterlyReviewsForGoal(goalId: string, year: number) {
  const quarters: GoalQuarter[] = ["Q1", "Q2", "Q3", "Q4"];
  return quarters.map((quarter) => ({
    goal_id: goalId,
    quarter,
    year,
    due_date: quarterDueDate(year, quarter),
    status: "not_started" as GoalStatus,
  }));
}

export type CompetencyGap = {
  competencyId: string;
  competencyName: string;
  category: string;
  gapCount: number;
  sources: string[];
};

export function analyzeCompetencyGaps(data: DashboardData, userId: string): CompetencyGap[] {
  const gaps = new Map<string, CompetencyGap>();

  for (const card of data.coachingCards.filter((c) => c.userId === userId)) {
    for (const gapText of card.gaps) {
      const matched = data.competencies.find(
        (c) =>
          gapText.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(gapText.toLowerCase().slice(0, 12)),
      );

      const key = matched?.id ?? gapText;
      const existing = gaps.get(key) ?? {
        competencyId: matched?.id ?? key,
        competencyName: matched?.name ?? gapText,
        category: matched?.category ?? "Coaching",
        gapCount: 0,
        sources: [],
      };

      existing.gapCount += 1;
      if (!existing.sources.includes("simulation")) {
        existing.sources.push("simulation");
      }
      gaps.set(key, existing);
    }

    for (const compName of card.linkedCompetencies) {
      const matched = data.competencies.find((c) => c.name === compName);
      if (matched) {
        const existing = gaps.get(matched.id) ?? {
          competencyId: matched.id,
          competencyName: matched.name,
          category: matched.category,
          gapCount: 0,
          sources: [],
        };
        existing.gapCount += 1;
        if (!existing.sources.includes("simulation")) {
          existing.sources.push("simulation");
        }
        gaps.set(matched.id, existing);
      }
    }
  }

  for (const plan of data.plans.filter((p) => p.userId === userId)) {
    for (const step of plan.steps.filter((s) => s.status === "not_started" || s.status === "in_progress")) {
      if (step.type === "challenge" || step.type === "simulation") {
        const key = `plan-${step.type}`;
        const existing = gaps.get(key) ?? {
          competencyId: key,
          competencyName: step.title,
          category: "Plan",
          gapCount: 0,
          sources: [],
        };
        existing.gapCount += 1;
        if (!existing.sources.includes("plan")) {
          existing.sources.push("plan");
        }
        gaps.set(key, existing);
      }
    }
  }

  return Array.from(gaps.values()).sort((a, b) => b.gapCount - a.gapCount).slice(0, 5);
}

export type AccountabilityItem = {
  userId: string;
  fullName: string;
  reason: string;
  severity: "high" | "medium";
  href: string;
};

export type AccountabilityMetrics = {
  inactiveSes: AccountabilityItem[];
  overdueGoalReviews: AccountabilityItem[];
  stuckPlanSteps: AccountabilityItem[];
  pendingSubmissions: number;
  pendingCoachingCards: number;
  avgReviewDays: number | null;
  overdueReviewCount: number;
};

export function buildAccountabilityMetrics(
  data: DashboardData,
  developmentPlans: DevelopmentPlan[],
  orgProfiles: Profile[],
): AccountabilityMetrics {
  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

  const inactiveSes: AccountabilityItem[] = [];
  const overdueGoalReviews: AccountabilityItem[] = [];
  const stuckPlanSteps: AccountabilityItem[] = [];

  for (const profile of orgProfiles) {
    const userActivity = data.activity.filter((a) => a.userId === profile.id);
    const lastActivity = userActivity[0]?.createdAt;

    if (!lastActivity || new Date(lastActivity).getTime() < fourteenDaysAgo) {
      const hasActivePlan = data.plans.some(
        (p) => p.userId === profile.id && p.status !== "completed",
      );

      if (hasActivePlan) {
        inactiveSes.push({
          userId: profile.id,
          fullName: profile.fullName,
          reason: "No activity in 14+ days with active onboarding plan",
          severity: "high",
          href: `/development?profile=${profile.id}`,
        });
      }
    }

    const devPlan = developmentPlans.find((p) => p.userId === profile.id && p.status === "active");

    if (devPlan) {
      for (const goal of devPlan.goals) {
        for (const review of goal.quarterlyReviews) {
          const isOverdue =
            review.status === "not_started" &&
            new Date(review.dueDate).getTime() < now &&
            !review.reviewedAt;

          const isDueSoon =
            review.status === "not_started" &&
            new Date(review.dueDate).getTime() - now < 14 * 24 * 60 * 60 * 1000 &&
            new Date(review.dueDate).getTime() >= now;

          if (isOverdue || isDueSoon) {
            overdueGoalReviews.push({
              userId: profile.id,
              fullName: profile.fullName,
              reason: isOverdue
                ? `${review.quarter} goal review overdue: ${goal.title}`
                : `${review.quarter} goal review due soon: ${goal.title}`,
              severity: isOverdue ? "high" : "medium",
              href: `/development?profile=${profile.id}&review=${review.id}`,
            });
          }
        }
      }
    }

    const userPlan = data.plans.find((p) => p.userId === profile.id);

    if (userPlan) {
      for (const step of userPlan.steps) {
        if (
          (step.status === "in_progress" || step.status === "not_started") &&
          step.dueDate &&
          new Date(step.dueDate).getTime() < now - 21 * 24 * 60 * 60 * 1000
        ) {
          stuckPlanSteps.push({
            userId: profile.id,
            fullName: profile.fullName,
            reason: `Stuck on plan step: ${step.title}`,
            severity: "medium",
            href: `/plans`,
          });
        }
      }
    }
  }

  const orgIds = new Set(orgProfiles.map((p) => p.id));
  const pendingSubmissions = data.submissions.filter(
    (s) => orgIds.has(s.userId) && s.status === "submitted",
  ).length;
  const pendingCoachingCards = data.coachingCards.filter(
    (c) => orgIds.has(c.userId) && c.managerReviewStatus === "pending",
  ).length;

  const reviewed = data.submissions.filter(
    (s) => orgIds.has(s.userId) && s.submittedAt && s.reviewedAt,
  );

  const avgReviewDays =
    reviewed.length > 0
      ? Math.round(
          reviewed.reduce((sum, s) => {
            const days =
              (new Date(s.reviewedAt!).getTime() - new Date(s.submittedAt!).getTime()) /
              (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / reviewed.length,
        )
      : null;

  return {
    inactiveSes: inactiveSes.slice(0, 10),
    overdueGoalReviews: overdueGoalReviews.slice(0, 10),
    stuckPlanSteps: stuckPlanSteps.slice(0, 10),
    pendingSubmissions,
    pendingCoachingCards,
    avgReviewDays,
    overdueReviewCount: overdueGoalReviews.filter((i) => i.severity === "high").length,
  };
}
