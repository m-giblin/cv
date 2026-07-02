import { analyzeCompetencyGaps, currentQuarter } from "@/lib/development/plan-utils";
import type {
  CertSummary,
  CohortBenchmark,
  QuarterlyAlert,
  SimTrend,
} from "@/lib/manager/growth-insights";
import { computeCareerProgress, practiceCadenceMessage } from "@/lib/growth/career-readiness";
import { profileLevelLabel } from "@/lib/utils/level-label";
import type {
  ActivityLog,
  ChallengeSubmission,
  CoachingCard,
  Competency,
  DashboardData,
  DevelopmentPlan,
  PlanStep,
  Profile,
  UserPlan,
} from "@/lib/types";

export type CoachingHealth = "on_track" | "coach_now" | "waiting_on_se" | "stalled" | "at_risk";

export type SeCoachingSummary = {
  health: CoachingHealth;
  healthLabel: string;
  storyLine: string;
  currentFocus: string | null;
  lastActiveLabel: string;
  lastActiveDays: number | null;
  onboardingProgress: number;
  onboardingLabel: string;
  devGoalsOnTrack: number;
  devGoalsTotal: number;
  devGoalsLabel: string;
  avgSimScore: number | null;
  latestSimScore: number | null;
  simTrendLabel: string;
  redoCount: number;
  openReviewCount: number;
  careerReadiness: number | null;
  topGaps: string[];
  talkingPoints: string[];
  quarterlyChip: string | null;
  quarterlyLabel: string | null;
  cohortShortLabel: string | null;
  certsLabel: string;
};

function daysSince(date: string | null | undefined) {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function currentPlanStep(plan?: UserPlan): PlanStep | null {
  if (!plan) return null;
  const sorted = [...plan.steps].sort((a, b) => a.order - b.order);
  return (
    sorted.find((step) => step.status === "in_progress" || step.status === "submitted") ??
    sorted.find((step) => step.status === "not_started") ??
    null
  );
}

function devGoalStats(plan?: DevelopmentPlan | null) {
  if (!plan || plan.goals.length === 0) {
    return { onTrack: 0, total: 0, quarterLabel: null, overdue: false };
  }

  const onTrack = plan.goals.filter(
    (goal) => goal.overallStatus === "on_track" || goal.overallStatus === "achieved",
  ).length;

  const quarter = currentQuarter();
  const year = plan.year;

  let overdue = false;
  for (const goal of plan.goals) {
    const review = goal.quarterlyReviews.find((item) => item.quarter === quarter && item.year === year);
    if (review && review.status !== "achieved" && review.dueDate < new Date().toISOString().slice(0, 10)) {
      overdue = true;
      break;
    }
  }

  return {
    onTrack,
    total: plan.goals.length,
    quarterLabel: `${quarter} ${year}`,
    overdue,
  };
}

const HEALTH_LABELS: Record<CoachingHealth, string> = {
  coach_now: "Coach now",
  waiting_on_se: "Waiting on SE",
  stalled: "Stalled",
  at_risk: "At risk",
  on_track: "On track",
};

export function buildSeCoachingSummary(params: {
  profile: Profile;
  plan?: UserPlan;
  developmentPlan?: DevelopmentPlan | null;
  coachingCards: CoachingCard[];
  submissions: ChallengeSubmission[];
  activity: ActivityLog[];
  openReviewCount: number;
  competencies: Competency[];
  approvedCerts?: string[];
  simTrend?: SimTrend;
  cohortBenchmark?: CohortBenchmark | null;
  quarterlyAlert?: QuarterlyAlert | null;
  certSummary?: CertSummary;
}): SeCoachingSummary {
  const {
    profile,
    plan,
    developmentPlan,
    coachingCards,
    submissions,
    activity,
    openReviewCount,
    competencies,
    approvedCerts = [],
    simTrend,
    cohortBenchmark,
    quarterlyAlert,
    certSummary,
  } = params;

  const redoCount =
    coachingCards.filter((card) => card.managerReviewStatus === "needs_revision").length +
    submissions.filter((sub) => sub.status === "in_progress" && sub.managerFeedback).length;

  const lastActivity = activity[0];
  const lastActiveDays = daysSince(lastActivity?.createdAt);
  const lastActiveLabel =
    lastActiveDays === null
      ? "No activity yet"
      : lastActiveDays === 0
        ? "Active today"
        : lastActiveDays === 1
          ? "Active yesterday"
          : `Last active ${lastActiveDays}d ago`;

  const currentStep = currentPlanStep(plan);
  const devStats = devGoalStats(developmentPlan);

  const avgSimScore = simTrend?.average ?? null;
  const latestSimScore = simTrend?.latest ?? null;
  const simTrendLabel = simTrend?.directionLabel ?? "No simulations yet";

  const miniDashboard = {
    coachingCards,
    competencies,
    plans: plan ? [plan] : [],
  } as Pick<DashboardData, "coachingCards" | "competencies" | "plans">;

  const gaps = analyzeCompetencyGaps(miniDashboard as DashboardData, profile.id);
  const topGaps = gaps.slice(0, 3).map((gap) => gap.competencyName);

  const career = computeCareerProgress({
    currentLevel: profileLevelLabel(profile),
    approvedCerts,
    planProgress: plan?.progress ?? 0,
    avgSimScore,
  });

  let health: CoachingHealth = "on_track";
  if (openReviewCount > 0 || quarterlyAlert?.overdue || devStats.overdue) {
    health = "coach_now";
  } else if (redoCount > 0) {
    health = "waiting_on_se";
  } else if (lastActiveDays !== null && lastActiveDays >= 14 && (plan?.progress ?? 0) < 100) {
    health = lastActiveDays >= 21 ? "at_risk" : "stalled";
  } else if (simTrend?.direction === "declining") {
    health = "stalled";
  }

  const storyParts: string[] = [];
  if (openReviewCount > 0) {
    storyParts.push(`${openReviewCount} awaiting your review`);
  } else if (quarterlyAlert?.overdue) {
    storyParts.push(quarterlyAlert.rosterChip ?? "Quarterly review overdue");
  } else if (redoCount > 0) {
    storyParts.push(`${redoCount} redo pending`);
  } else if (currentStep) {
    storyParts.push(`On: ${currentStep.title}`);
  }

  if (simTrend && simTrend.direction !== "insufficient") {
    storyParts.push(simTrendLabel.replace("Improving", "↑").replace("Slipping", "↓"));
  }

  if (cohortBenchmark?.simDelta !== null && cohortBenchmark && Math.abs(cohortBenchmark.simDelta ?? 0) >= 5) {
    storyParts.push(
      cohortBenchmark.simDelta! > 0
        ? `Above ${cohortBenchmark.cohortLabel} on sims`
        : `Below ${cohortBenchmark.cohortLabel} on sims`,
    );
  } else if (devStats.total > 0) {
    storyParts.push(`Dev ${devStats.onTrack}/${devStats.total} on track`);
  } else {
    storyParts.push(lastActiveLabel);
  }

  const cohortShortLabel =
    cohortBenchmark && cohortBenchmark.simDelta !== null && Math.abs(cohortBenchmark.simDelta) >= 5
      ? cohortBenchmark.simComparisonLabel
      : cohortBenchmark?.onboardingComparisonLabel ?? null;

  const talkingPoints: string[] = [];
  if (openReviewCount > 0) {
    talkingPoints.push("Review submitted work in your inbox before your 1:1.");
  }
  if (redoCount > 0) {
    talkingPoints.push("Follow up on sent-back items — confirm they understand the feedback and have a redo plan.");
  }
  if (simTrend?.direction === "declining") {
    talkingPoints.push(`Simulation scores are slipping — ${simTrendLabel}. Assign targeted practice.`);
  }
  if (simTrend?.direction === "improving") {
    talkingPoints.push(`Momentum on simulations — ${simTrendLabel}. Reinforce what's working.`);
  }
  if (cohortBenchmark && cohortBenchmark.simDelta !== null && cohortBenchmark.simDelta <= -5) {
    talkingPoints.push(cohortBenchmark.simComparisonLabel);
  }
  if (certSummary?.nextGateLabel && certSummary.nextGateStatus !== "approved") {
    talkingPoints.push(
      `Next cert gate: ${certSummary.nextGateLabel} (${certSummary.nextGateStatus?.replaceAll("_", " ") ?? "not started"}).`,
    );
  }
  if (topGaps.length > 0) {
    talkingPoints.push(`Recurring gap: ${topGaps[0]} — tie to next practice or dev goal.`);
  }
  if (quarterlyAlert?.overdue) {
    talkingPoints.push(quarterlyAlert.label);
  } else if (quarterlyAlert && quarterlyAlert.pendingGoals > 0) {
    talkingPoints.push(quarterlyAlert.label);
  }
  if (lastActiveDays !== null && lastActiveDays >= 14) {
    talkingPoints.push(`Engagement drop: no activity in ${lastActiveDays} days — check blockers.`);
  }
  if (practiceCadenceMessage(lastActivity?.createdAt ?? null).includes("Overdue")) {
    talkingPoints.push("Practice cadence is slipping — assign or encourage a simulation.");
  }
  if (career.nextStage && career.readinessPercent < 60) {
    talkingPoints.push(
      `Career path: ${career.readinessPercent}% ready for ${career.nextStage.title} — review cert and plan milestones.`,
    );
  }
  if (talkingPoints.length === 0) {
    talkingPoints.push("Celebrate validated steps and set the next stretch goal.");
  }

  const certsLabel = certSummary
    ? `${certSummary.approved}/${certSummary.total || certSummary.items.length} certs`
    : `${approvedCerts.length} certs`;

  return {
    health,
    healthLabel: HEALTH_LABELS[health],
    storyLine: storyParts.join(" · "),
    currentFocus: currentStep?.title ?? developmentPlan?.goals[0]?.title ?? null,
    lastActiveLabel,
    lastActiveDays,
    onboardingProgress: plan?.progress ?? 0,
    onboardingLabel: plan?.name ?? "No onboarding plan",
    devGoalsOnTrack: devStats.onTrack,
    devGoalsTotal: devStats.total,
    devGoalsLabel:
      devStats.total > 0
        ? `${devStats.onTrack}/${devStats.total} goals on track`
        : "No dev plan yet",
    avgSimScore,
    latestSimScore,
    simTrendLabel,
    redoCount,
    openReviewCount,
    careerReadiness: career.nextStage ? career.readinessPercent : 100,
    topGaps,
    talkingPoints,
    quarterlyChip: quarterlyAlert?.rosterChip ?? null,
    quarterlyLabel: quarterlyAlert?.label ?? null,
    cohortShortLabel,
    certsLabel,
  };
}

export function healthBadgeTone(health: CoachingHealth) {
  switch (health) {
    case "coach_now":
      return "amber" as const;
    case "waiting_on_se":
      return "purple" as const;
    case "stalled":
      return "amber" as const;
    case "at_risk":
      return "red" as const;
    default:
      return "green" as const;
  }
}
