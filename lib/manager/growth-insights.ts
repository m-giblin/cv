import { format } from "date-fns";
import { CERT_LABELS, CAREER_STAGES } from "@/lib/growth/career-readiness";
import { currentQuarter } from "@/lib/development/plan-utils";
import { profileLevelLabel } from "@/lib/utils/level-label";
import type { CoachingCard, DevelopmentPlan, Profile, UserPlan } from "@/lib/types";
import type { ReadinessCertRow } from "@/lib/data/get-manager-growth-data";

export type SimScorePoint = {
  score: number;
  label: string;
  date: string;
};

export type SimTrend = {
  points: SimScorePoint[];
  latest: number | null;
  average: number | null;
  priorAverage: number | null;
  direction: "improving" | "declining" | "stable" | "insufficient";
  directionLabel: string;
};

export type CohortBenchmark = {
  cohortLabel: string;
  cohortSize: number;
  userSimAvg: number | null;
  cohortSimAvg: number | null;
  simDelta: number | null;
  simComparisonLabel: string;
  userOnboardingProgress: number;
  cohortOnboardingAvg: number;
  onboardingDelta: number;
  onboardingComparisonLabel: string;
};

export type QuarterlyAlert = {
  quarter: string;
  year: number;
  dueDate: string;
  overdue: boolean;
  pendingGoals: number;
  label: string;
  rosterChip: string | null;
};

export type CertSummary = {
  approved: number;
  total: number;
  nextGateLabel: string | null;
  nextGateStatus: string | null;
  items: Array<{ type: string; label: string; status: string }>;
};

export function quarterCohortLabel(plan?: UserPlan) {
  if (!plan?.startDate) return "Unassigned";
  const month = new Date(plan.startDate).getMonth();
  const year = new Date(plan.startDate).getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

export function buildSimTrend(cards: CoachingCard[]): SimTrend {
  const sorted = [...cards]
    .filter((card) => card.score > 0)
    .sort((a, b) => new Date(b.sentToManagerAt).getTime() - new Date(a.sentToManagerAt).getTime());

  const points: SimScorePoint[] = sorted.slice(0, 6).reverse().map((card) => ({
    score: card.score,
    label: card.simulationContext?.persona?.split(" ")[0] ?? "Sim",
    date: card.sentToManagerAt,
  }));

  if (points.length === 0) {
    return {
      points: [],
      latest: null,
      average: null,
      priorAverage: null,
      direction: "insufficient",
      directionLabel: "No simulations yet",
    };
  }

  const latest = points[points.length - 1]?.score ?? null;
  const average = Math.round((points.reduce((sum, p) => sum + p.score, 0) / points.length) * 10) / 10;

  let priorAverage: number | null = null;
  if (points.length >= 3) {
    const prior = points.slice(0, -1);
    priorAverage = Math.round((prior.reduce((sum, p) => sum + p.score, 0) / prior.length) * 10) / 10;
  }

  let direction: SimTrend["direction"] = "stable";
  let directionLabel = "Holding steady";

  if (points.length >= 2 && latest !== null && priorAverage !== null) {
    const delta = latest - priorAverage;
    if (delta >= 8) {
      direction = "improving";
      directionLabel = `Improving (+${Math.round(delta)} vs prior avg)`;
    } else if (delta <= -8) {
      direction = "declining";
      directionLabel = `Slipping (${Math.round(delta)} vs prior avg)`;
    }
  } else if (points.length === 2 && latest !== null) {
    const delta = latest - points[0].score;
    if (delta >= 8) directionLabel = `Up ${delta} from first attempt`;
    else if (delta <= -8) directionLabel = `Down ${Math.abs(delta)} from first attempt`;
  }

  return { points, latest, average, priorAverage, direction, directionLabel };
}

export function buildCohortBenchmark(params: {
  profileId: string;
  plan?: UserPlan;
  coachingCards: CoachingCard[];
  orgPlans: UserPlan[];
  orgCoachingCards: CoachingCard[];
}): CohortBenchmark | null {
  const cohortLabel = quarterCohortLabel(params.plan);
  const cohortMemberIds = new Set(
    params.orgPlans.filter((plan) => quarterCohortLabel(plan) === cohortLabel).map((plan) => plan.userId),
  );

  if (cohortMemberIds.size < 2) {
    return null;
  }

  const cohortCards = params.orgCoachingCards.filter(
    (card) => cohortMemberIds.has(card.userId) && card.score > 0,
  );
  const userCards = params.coachingCards.filter((card) => card.score > 0);

  const avg = (cards: CoachingCard[]) =>
    cards.length > 0
      ? Math.round((cards.reduce((sum, c) => sum + c.score, 0) / cards.length) * 10) / 10
      : null;

  const userSimAvg = avg(userCards);
  const cohortSimAvg = avg(cohortCards);

  const cohortPlans = params.orgPlans.filter((plan) => cohortMemberIds.has(plan.userId));
  const cohortOnboardingAvg = cohortPlans.length
    ? Math.round(cohortPlans.reduce((sum, p) => sum + p.progress, 0) / cohortPlans.length)
    : 0;
  const userOnboardingProgress = params.plan?.progress ?? 0;
  const onboardingDelta = userOnboardingProgress - cohortOnboardingAvg;

  let simComparisonLabel = "Sim data not available yet";
  if (userSimAvg !== null && cohortSimAvg !== null) {
    const simDelta = Math.round((userSimAvg - cohortSimAvg) * 10) / 10;
    if (simDelta >= 5) {
      simComparisonLabel = `${simDelta} pts above ${cohortLabel} cohort avg (${cohortSimAvg})`;
    } else if (simDelta <= -5) {
      simComparisonLabel = `${Math.abs(simDelta)} pts below ${cohortLabel} cohort avg (${cohortSimAvg})`;
    } else {
      simComparisonLabel = `In line with ${cohortLabel} cohort avg (${cohortSimAvg})`;
    }
  }

  let onboardingComparisonLabel = `Onboarding ${userOnboardingProgress}% vs cohort ${cohortOnboardingAvg}%`;
  if (onboardingDelta >= 10) {
    onboardingComparisonLabel = `${onboardingDelta} pts ahead of ${cohortLabel} cohort on onboarding`;
  } else if (onboardingDelta <= -10) {
    onboardingComparisonLabel = `${Math.abs(onboardingDelta)} pts behind ${cohortLabel} cohort on onboarding`;
  } else {
    onboardingComparisonLabel = `Onboarding in line with ${cohortLabel} cohort`;
  }

  return {
    cohortLabel,
    cohortSize: cohortMemberIds.size,
    userSimAvg,
    cohortSimAvg,
    simDelta:
      userSimAvg !== null && cohortSimAvg !== null
        ? Math.round((userSimAvg - cohortSimAvg) * 10) / 10
        : null,
    simComparisonLabel,
    userOnboardingProgress,
    cohortOnboardingAvg,
    onboardingDelta,
    onboardingComparisonLabel,
  };
}

export function buildQuarterlyAlert(developmentPlan?: DevelopmentPlan | null): QuarterlyAlert | null {
  if (!developmentPlan || developmentPlan.goals.length === 0) {
    return null;
  }

  const quarter = currentQuarter();
  const year = developmentPlan.year;
  const today = new Date().toISOString().slice(0, 10);

  let pendingGoals = 0;
  let overdue = false;
  let earliestDue = "";

  for (const goal of developmentPlan.goals) {
    const review = goal.quarterlyReviews.find((item) => item.quarter === quarter && item.year === year);
    if (!review) continue;
    if (review.status === "achieved" || review.status === "on_track") continue;

    pendingGoals += 1;
    if (review.dueDate < today) {
      overdue = true;
    }
    if (!earliestDue || review.dueDate < earliestDue) {
      earliestDue = review.dueDate;
    }
  }

  if (pendingGoals === 0) {
    return {
      quarter,
      year,
      dueDate: earliestDue,
      overdue: false,
      pendingGoals: 0,
      label: `${quarter} ${year} quarterly reviews complete`,
      rosterChip: null,
    };
  }

  const dueLabel = earliestDue ? format(new Date(earliestDue), "MMM d") : "";
  const label = overdue
    ? `${quarter} ${year} quarterly review overdue (${pendingGoals} goal${pendingGoals === 1 ? "" : "s"})`
    : `${quarter} ${year} quarterly review due ${dueLabel} (${pendingGoals} pending)`;

  return {
    quarter,
    year,
    dueDate: earliestDue,
    overdue,
    pendingGoals,
    label,
    rosterChip: overdue ? `${quarter} overdue` : pendingGoals > 0 ? `${quarter} due` : null,
  };
}

export function buildCertSummary(profile: Profile, certs: ReadinessCertRow[]): CertSummary {
  const items = certs.map((cert) => ({
    type: cert.certificationType,
    label: CERT_LABELS[cert.certificationType] ?? cert.certificationType,
    status: cert.status,
  }));

  const approved = items.filter((item) => item.status === "approved").length;
  const level = profileLevelLabel(profile);
  const stageIndex = CAREER_STAGES.findIndex((stage) => stage.level === level);
  const nextStage = CAREER_STAGES[stageIndex + 1];

  const approvedTypes = items.filter((item) => item.status === "approved").map((item) => item.type);

  let nextGateLabel: string | null = null;
  let nextGateStatus: string | null = null;

  if (nextStage) {
    const missing = nextStage.certifications.find((cert) => !approvedTypes.includes(cert));
    if (missing) {
      nextGateLabel = CERT_LABELS[missing] ?? missing;
      nextGateStatus = items.find((item) => item.type === missing)?.status ?? "not_started";
    }
  }

  return {
    approved,
    total: items.length || (nextStage?.certifications.length ?? 0),
    nextGateLabel,
    nextGateStatus,
    items,
  };
}
