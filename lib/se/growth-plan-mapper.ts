import type { AISignal, DevGoal, QuarterSummary, SeGrowthPlanData } from "@/components/se/growth-plan/types";
import { goalProgressColor, goalTagStyle } from "@/components/manager/development-plans/utils/goalBuilder";
import type { GoalTag } from "@/components/manager/development-plans/types";
import { currentQuarter } from "@/lib/development/plan-utils";
import type { CoachingCard, DevelopmentGoal, DevelopmentPlan, GoalQuarter, UserPlan } from "@/lib/types";

const EVIDENCE_ICON: Record<DevelopmentGoal["evidenceType"], string> = {
  demo_recording: "●",
  customer_reference: "◆",
  certification: "✓",
  deal_support: "◆",
  shadow_notes: "○",
  other: "•",
};

const STATUS_TAG: Record<DevelopmentGoal["overallStatus"], GoalTag> = {
  achieved: "ON TRACK",
  on_track: "ON TRACK",
  at_risk: "AT RISK",
  not_started: "NOT STARTED",
};

function formatShortDate(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}

function goalProgress(goal: DevelopmentGoal): number {
  const reviews = goal.quarterlyReviews;
  if (reviews.length === 0) {
    switch (goal.overallStatus) {
      case "achieved":
        return 100;
      case "on_track":
        return 70;
      case "at_risk":
        return 25;
      case "not_started":
        return 0;
      default: {
        const _exhaustive: never = goal.overallStatus;
        return _exhaustive;
      }
    }
  }

  const done = reviews.filter((review) => review.status === "achieved" || review.status === "on_track").length;
  return Math.round((done / reviews.length) * 100);
}

function goalQuarterLabel(goal: DevelopmentGoal, planYear: number): string {
  const nextReview =
    goal.quarterlyReviews.find((review) => review.status !== "achieved") ?? goal.quarterlyReviews.at(-1);
  if (!nextReview) {
    return `${currentQuarter()} ${planYear}`;
  }
  return `${nextReview.quarter} ${nextReview.year}`;
}

function goalDueDate(goal: DevelopmentGoal): string {
  const pending = goal.quarterlyReviews
    .filter((review) => review.status !== "achieved")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return pending ? formatShortDate(pending.dueDate) : "TBD";
}

function developmentGoalToDevGoal(goal: DevelopmentGoal, planYear: number): DevGoal {
  const progress = goalProgress(goal);
  const tag = STATUS_TAG[goal.overallStatus];
  const tagStyle = goalTagStyle(tag);
  const progressColor = goalProgressColor(progress);
  const overdue = goal.overallStatus === "at_risk";

  return {
    icon: EVIDENCE_ICON[goal.evidenceType],
    title: goal.title,
    quarter: goalQuarterLabel(goal, planYear),
    source: "Manager · Annual plan",
    progress,
    tag,
    tagBg: tagStyle.bg,
    tagColor: tagStyle.color,
    progressColor,
    dueDate: goalDueDate(goal),
    dueDateColor: overdue ? "#B42318" : "#4A5878",
    bg: overdue ? "#FCEBEA" : "#FFFFFF",
    borderColor: overdue ? "#B42318" : "#D6DCE8",
    milestones: goal.quarterlyReviews.map((review) => ({
      label: `${review.quarter} checkpoint`,
      date: formatShortDate(review.dueDate),
      done: review.status === "achieved",
    })),
  };
}

function quarterSummariesFromPlan(plan: DevelopmentPlan): QuarterSummary[] {
  const quarters: GoalQuarter[] = ["Q1", "Q2", "Q3", "Q4"];
  const nowQuarter = currentQuarter();
  const year = plan.year;

  return quarters.map((label) => {
    const reviews = plan.goals.flatMap((goal) =>
      goal.quarterlyReviews.filter((review) => review.quarter === label && review.year === year),
    );

    if (reviews.length === 0) {
      const isFuture =
        (label === "Q1" && nowQuarter !== "Q1") ||
        (label === "Q2" && (nowQuarter === "Q3" || nowQuarter === "Q4")) ||
        (label === "Q3" && nowQuarter === "Q4");

      return {
        label,
        summary: isFuture ? "Not scheduled" : "No goals this quarter",
        needsAction: false,
        bg: "#FFFFFF",
        border: "#D6DCE8",
        labelColor: "#4A5878",
      };
    }

    const done = reviews.filter((review) => review.status === "achieved").length;
    const overdue = reviews.some((review) => review.status === "at_risk");
    const inProgress = reviews.some((review) => review.status === "on_track" || review.status === "not_started");
    const isCurrent = label === nowQuarter;

    let summary = `${done}/${reviews.length} checkpoints complete`;
    if (overdue) {
      summary = "Action needed on quarterly reviews";
    } else if (inProgress && isCurrent) {
      summary = `${plan.goals.length} active goal${plan.goals.length === 1 ? "" : "s"}`;
    }

    return {
      label,
      summary,
      needsAction: overdue,
      bg: overdue ? "#FBF1DF" : isCurrent ? "#E5ECFA" : "#FFFFFF",
      border: overdue ? "#8A5300" : isCurrent ? "#3A62C0" : "#D6DCE8",
      labelColor: overdue ? "#8A5300" : isCurrent ? "#0033A1" : "#4A5878",
    };
  });
}

export function buildGrowthPlanSignals(params: {
  userPlan?: UserPlan | null;
  coachingCards?: CoachingCard[];
}): AISignal[] {
  const signals: AISignal[] = [];
  const { userPlan, coachingCards = [] } = params;

  if (userPlan) {
    signals.push({
      icon: userPlan.progress >= 35 ? "✓" : "▲",
      label: "Ramp progress",
      value: `${userPlan.progress}%`,
      color: userPlan.progress >= 35 ? "#12703F" : "#B42318",
      detail: userPlan.name,
    });
  }

  const scored = coachingCards.filter((card) => card.score > 0);
  if (scored.length > 0) {
    const latest = scored[0]?.score ?? 0;
    const earliest = scored.at(-1)?.score ?? latest;
    const delta = latest - earliest;
    const trend = delta >= 0 ? `(↑${delta} pts)` : `(↓${Math.abs(delta)} pts)`;
    signals.push({
      icon: delta >= 0 ? "✓" : "▲",
      label: "Sim trend",
      value: `${earliest}→${latest} ${trend}`,
      color: delta >= 0 ? "#12703F" : "#B42318",
      detail: `Across ${scored.length} scored session${scored.length === 1 ? "" : "s"}`,
    });
  }

  if (coachingCards.length > 0 && coachingCards[0]?.gaps?.length) {
    signals.push({
      icon: "•",
      label: "Top gap",
      value: coachingCards[0].gaps[0] ?? "—",
      color: "#8A5300",
      detail: "From your latest coaching card",
    });
  }

  return signals.slice(0, 6);
}

export function developmentPlanToSeGrowthPlan(
  plan: DevelopmentPlan,
  signals: AISignal[] = [],
): SeGrowthPlanData {
  return {
    hasPlan: plan.goals.length > 0,
    signals,
    goals: plan.goals.map((goal) => developmentGoalToDevGoal(goal, plan.year)),
    quarters: quarterSummariesFromPlan(plan),
  };
}

export function emptySeGrowthPlan(): SeGrowthPlanData {
  return {
    hasPlan: false,
    signals: [],
    goals: [],
    quarters: [],
  };
}
