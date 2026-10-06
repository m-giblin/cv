import { CAREER_STAGES, CERT_LABELS } from "@/lib/growth/career-readiness";
import type { CertSummary } from "@/lib/manager/growth-insights";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import type { Profile, UserPlan } from "@/lib/types";

/** Below this readiness score an SE is flagged at risk (the "under 60" band on Team › Readiness). */
export const AT_RISK_READINESS = 60;
/** Team target used across the manager portal. */
export const READINESS_TARGET = 70;
/** Inbox items older than this many days are flagged in danger. */
export const INBOX_SLA_DAYS = 3;
/** Days without a reviewed coaching touchpoint before an on-track SE gets a nudge. */
const COACHING_CADENCE_DAYS = 14;

export type TeamStatus = "at_risk" | "review_due" | "on_track";

export type TeamActionKind = "review" | "sign_off" | "practice" | "one_on_one" | "assign_plan";

export type TeamAction = { kind: TeamActionKind; label: string };

export type GateStampState = "earned" | "ready" | "partial" | "none";

export type TeamGate = { id: string; label: string; state: GateStampState };

/** Oldest item waiting on the manager for one SE (built from the inbox sources). */
export type PendingReviewSummary = {
  title: string;
  kind: "challenge" | "sim" | "plan_step" | "cert" | "deal_prep";
  ageDays: number | null;
  count: number;
};

export type TeamMember = {
  profileId: string;
  fullName: string;
  firstName: string;
  email: string;
  level: string;
  /** Week of the current ramp (1-based), or null without an active plan. */
  rampWeek: number | null;
  /** Second line under the name: "Basic, week 7" or just the level. */
  subline: string;
  readiness: number | null;
  status: TeamStatus;
  reason: string | null;
  action: TeamAction | null;
  rampDone: number;
  rampTotal: number;
  gates: TeamGate[];
  gatesCleared: number;
  lowCompetency: { name: string; score: number } | null;
  daysSinceCoaching: number | null;
  talkingPoints: string[];
  /** Oldest item waiting on the manager, if any. */
  pending: PendingReviewSummary | null;
};

/** The five career gates, in order (Basic → Senior → Advisory). */
export const CAREER_GATE_TYPES: string[] = CAREER_STAGES.flatMap((stage) => stage.certifications);

function gateState(status: string | undefined): GateStampState {
  if (status === "approved") return "earned";
  if (status === "submitted") return "ready";
  if (status === "in_progress") return "partial";
  return "none";
}

export function buildGates(certSummary: CertSummary | undefined): TeamGate[] {
  return CAREER_GATE_TYPES.map((type) => {
    const item = certSummary?.items.find((cert) => cert.type === type);
    return { id: type, label: CERT_LABELS[type] ?? type, state: gateState(item?.status) };
  });
}

function overdueStepCount(plan: UserPlan | undefined, now: number) {
  if (!plan) return 0;
  return plan.steps.filter(
    (step) =>
      step.dueDate &&
      new Date(step.dueDate).getTime() < now &&
      !["reviewed", "completed", "submitted", "under_review"].includes(step.status),
  ).length;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function pendingReason(pending: PendingReviewSummary) {
  const more = pending.count > 1 ? `, plus ${pending.count - 1} more` : "";
  if (pending.kind === "cert") return `${pending.title} evidence ready${more}`;
  if (pending.ageDays !== null && pending.ageDays > 0) {
    return `${pending.title} waiting ${plural(pending.ageDays, "day")}${more}`;
  }
  return `${pending.title} submitted${more}`;
}

const REVIEW_LABEL: Record<PendingReviewSummary["kind"], string> = {
  challenge: "Review challenge",
  sim: "Review sim card",
  plan_step: "Review step",
  cert: "Review gate",
  deal_prep: "Review deal prep",
};

/** Joins reason phrases into one sentence: "No activity in 9 days, objection handling at 52". */
function joinPhrases(parts: string[]) {
  return parts
    .map((part, index) => (index === 0 ? part : part.charAt(0).toLowerCase() + part.slice(1)))
    .join(", ");
}

/** Week of the current ramp (1-based), or null without an active plan. */
export function rampWeekFor(plan: UserPlan | undefined, now: number): number | null {
  if (!plan || plan.progress >= 100 || !plan.startDate) return null;
  const start = new Date(plan.startDate).getTime();
  if (Number.isNaN(start) || start > now) return null;
  return Math.floor((now - start) / (7 * 86_400_000)) + 1;
}

function lowestCompetency(summary: Record<string, number> | undefined) {
  if (!summary) return null;
  const entries = Object.entries(summary).filter(([, score]) => Number.isFinite(score));
  if (entries.length === 0) return null;
  const [name, score] = entries.sort((a, b) => a[1] - b[1])[0]!;
  return { name, score: Math.round(score) };
}

export function buildTeamMember(input: {
  profile: Profile;
  plan?: UserPlan;
  coaching?: SeCoachingSummary;
  certSummary?: CertSummary;
  openReviewCount: number;
  pending?: PendingReviewSummary | null;
  readiness: number | null;
  competencySummary?: Record<string, number>;
  daysSinceCoaching: number | null;
  now?: number;
}): TeamMember {
  const { profile, plan, coaching, certSummary, openReviewCount, pending, readiness, daysSinceCoaching } = input;
  const now = input.now ?? Date.now();
  const firstName = profile.fullName.split(" ")[0] ?? profile.fullName;
  const gates = buildGates(certSummary);
  const steps = plan?.steps ?? [];
  const rampDone = steps.filter((step) => step.status === "reviewed" || step.status === "completed").length;
  const low = lowestCompetency(input.competencySummary);
  const lowCompetency = low && low.score < AT_RISK_READINESS ? low : null;

  const atRisk =
    (readiness !== null && readiness < AT_RISK_READINESS) ||
    coaching?.health === "at_risk" ||
    coaching?.health === "stalled";

  const status: TeamStatus = atRisk ? "at_risk" : openReviewCount > 0 ? "review_due" : "on_track";

  const reviewAction: TeamAction | null =
    openReviewCount > 0
      ? pending?.kind === "cert"
        ? { kind: "sign_off", label: REVIEW_LABEL.cert }
        : { kind: "review", label: pending ? REVIEW_LABEL[pending.kind] : "Review" }
      : null;
  const noPlan = !plan;

  let reason: string | null = null;
  let action: TeamAction | null = null;

  if (status === "at_risk") {
    const parts: string[] = [];
    if (noPlan) parts.push("No ramp plan assigned");
    const idle = coaching?.lastActiveDays ?? null;
    if (idle !== null && idle >= 7) parts.push(`No activity in ${idle} days`);
    if (lowCompetency) parts.push(`${lowCompetency.name} at ${lowCompetency.score}`);
    const overdue = overdueStepCount(plan, now);
    if (overdue > 0) parts.push(`${plural(overdue, "step")} overdue`);
    if (parts.length < 2 && coaching?.simTrendLabel && coaching.simTrendLabel.startsWith("Slipping")) {
      parts.push(coaching.simTrendLabel);
    }
    if (parts.length === 0 && readiness !== null) parts.push(`Readiness ${readiness}, under ${AT_RISK_READINESS}`);
    if (parts.length === 0 && coaching) parts.push(coaching.healthLabel);
    reason = joinPhrases(parts.slice(0, 2)) || null;
    action =
      reviewAction ??
      (noPlan
        ? { kind: "assign_plan", label: "Assign a plan" }
        : lowCompetency
          ? { kind: "practice", label: "Assign practice" }
          : { kind: "one_on_one", label: "Schedule a 1:1" });
  } else if (status === "review_due") {
    reason = pending ? pendingReason(pending) : `${plural(openReviewCount, "item")} waiting on you`;
    action = reviewAction;
  } else if (daysSinceCoaching !== null && daysSinceCoaching > COACHING_CADENCE_DAYS) {
    reason = `No coaching in ${daysSinceCoaching} days`;
    action = { kind: "one_on_one", label: "Schedule a 1:1" };
  }

  const rampWeek = rampWeekFor(plan, now);

  return {
    profileId: profile.id,
    fullName: profile.fullName,
    firstName,
    email: profile.email,
    level: profile.level,
    rampWeek,
    subline: rampWeek !== null ? `${profile.level}, week ${rampWeek}` : profile.level,
    readiness,
    status,
    reason,
    action,
    rampDone,
    rampTotal: steps.length,
    gates,
    gatesCleared: gates.filter((gate) => gate.state === "earned").length,
    lowCompetency,
    daysSinceCoaching,
    talkingPoints: coaching?.talkingPoints ?? [],
    pending: pending ?? null,
  };
}

const STATUS_ORDER: Record<TeamStatus, number> = { at_risk: 0, review_due: 1, on_track: 2 };

/** Urgency order: at risk (lowest readiness first), waiting on you, then on track with a nudge first. */
export function sortByUrgency(members: TeamMember[]): TeamMember[] {
  return [...members].sort((a, b) => {
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (a.status === "on_track" && Boolean(a.action) !== Boolean(b.action)) return a.action ? -1 : 1;
    const ar = a.readiness ?? 101;
    const br = b.readiness ?? 101;
    return a.status === "on_track" ? br - ar : ar - br;
  });
}

/** Whole days since an ISO timestamp, or null when unknown. */
export function ageInDays(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now - time) / 86_400_000));
}
