import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { planIsComplete } from "@/lib/plans/ramp-week";
import type { Profile, UserPlan } from "@/lib/types";
import { initials } from "@/lib/utils";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import { format, parseISO, addDays } from "date-fns";

export type PhaseCellStatus = "complete" | "active" | "blocked" | "upcoming";

export type PhaseCell = {
  status: PhaseCellStatus;
  bg: string;
  icon: string;
  textColor: string;
  label: string;
};

export type ProgramMatrixRow = {
  userId: string;
  name: string;
  initials: string;
  avatarBg: string;
  level: string;
  phases: PhaseCell[];
  overall: string;
  overallColor: string;
  overallPct: number;
};

export type ProgramBlockedAlert = {
  userId: string;
  name: string;
  phaseLabel: string;
  reason: string;
};

export type ProgramMilestone = {
  date: string;
  isoDate: string;
  label: string;
  color: string;
  statBg: string;
  statColor: string;
  status: string;
};

export type ProgramTrackerModel = {
  cohortSize: number;
  levelSummary: string;
  onTrack: number;
  onTrackPct: number;
  blocked: number;
  blockedName: string | null;
  avgCompletion: number;
  certGatesCleared: number;
  certGatesTotal: number;
  blockedAlert: ProgramBlockedAlert | null;
  matrixRows: ProgramMatrixRow[];
  milestones: ProgramMilestone[];
};

const PHASE_LABELS = [
  "Phase 1 · Foundations",
  "Phase 2 · Technical",
  "Phase 3 · Field Apply",
  "Phase 4 · Cert Gates",
] as const;

const PHASE_STATUS: Record<PhaseCellStatus, Omit<PhaseCell, "status">> = {
  complete: { bg: "#EDFAF3", icon: "✓", textColor: "#0A6E45", label: "Complete" },
  active: { bg: "#F0F7FF", icon: "→", textColor: "#0071CE", label: "In progress" },
  blocked: { bg: "#FEF0EE", icon: "!", textColor: "#B83128", label: "Blocked" },
  upcoming: { bg: "#F9F8F6", icon: "○", textColor: "#A09D98", label: "Upcoming" },
};

export const PROGRAM_PHASE_DEFINITIONS = [
  {
    emoji: "📚",
    bg: "#F0F7FF",
    border: "rgba(0,113,206,.15)",
    name: "Phase 1 — Foundations (Wks 1–2)",
    desc: "Product overview · ISC basics · Sales motion · IGA landscape",
  },
  {
    emoji: "⚙️",
    bg: "#F0FDF7",
    border: "rgba(10,110,69,.15)",
    name: "Phase 2 — Technical Depth (Wks 3–4)",
    desc: "Demo env setup · ISC lab · Technical challenges · Architecture",
  },
  {
    emoji: "🎯",
    bg: "#FFF7ED",
    border: "rgba(212,129,10,.15)",
    name: "Phase 3 — Field Application (Wks 5–6)",
    desc: "Discovery sims · Deal prep · Objection handling · SLED/ENT verticals",
  },
  {
    emoji: "🏆",
    bg: "#EDFAF3",
    border: "rgba(10,110,69,.15)",
    name: "Phase 4 — Cert Gates (Ongoing)",
    desc: "Solo discovery · Executive demo · Competitive bakeoff · Manager sign-off",
  },
] as const;

function phaseCell(status: PhaseCellStatus): PhaseCell {
  return { status, ...PHASE_STATUS[status] };
}

function stepsForSegment(plan: UserPlan, segment: number) {
  return plan.steps.filter((step) => (step.segmentIndex ?? 1) === segment);
}

function segmentPhaseStatus(
  plan: UserPlan,
  segment: number,
  coaching?: SeCoachingSummary,
): PhaseCellStatus {
  const unlocked = plan.unlockedSegmentMax ?? 1;
  const steps = stepsForSegment(plan, segment);

  if (segment > unlocked) return "upcoming";
  if (steps.length === 0 && segment > unlocked) return "upcoming";

  const allDone =
    steps.length > 0 &&
    steps.every((step) => step.status === "reviewed" || step.status === "completed");

  if (allDone) return "complete";

  const avgSim = coaching?.avgSimScore ?? null;
  const isBlockedSegment =
    segment === unlocked &&
    ((avgSim !== null && avgSim < 65) ||
      coaching?.health === "at_risk" ||
      coaching?.health === "stalled");

  if (isBlockedSegment && !allDone) return "blocked";

  if (segment <= unlocked) return "active";
  return "upcoming";
}

function overallColor(progress: number, hasBlocked: boolean): string {
  if (hasBlocked) return "#B83128";
  if (progress >= 100) return "#0A6E45";
  return "#0071CE";
}

function milestoneStatus(isoDate: string, now = new Date()): {
  status: string;
  color: string;
  statBg: string;
  statColor: string;
} {
  const due = parseISO(isoDate);
  const days = Math.floor((due.getTime() - now.getTime()) / 86_400_000);

  if (days < 0) {
    return { status: "OVERDUE", color: "#B83128", statBg: "#FEF0EE", statColor: "#B83128" };
  }
  if (days <= 3) {
    return { status: "CRITICAL", color: "#B83128", statBg: "#FEF0EE", statColor: "#B83128" };
  }
  if (days <= 10) {
    return { status: "DUE SOON", color: "#D4810A", statBg: "#FFFBF0", statColor: "#D4810A" };
  }
  if (days <= 21) {
    return { status: "ON TRACK", color: "#0A6E45", statBg: "#EDFAF3", statColor: "#0A6E45" };
  }
  return { status: "PLANNED", color: "#A09D98", statBg: "#F9F8F6", statColor: "#A09D98" };
}

export function buildProgramTrackerModel({
  org,
  plans,
  coachingByUser,
  approvedCertCountByUser,
}: {
  org: Profile[];
  plans: UserPlan[];
  coachingByUser: Record<string, SeCoachingSummary>;
  approvedCertCountByUser: Record<string, number>;
}): ProgramTrackerModel {
  const teamPlans = plans.filter((plan) => org.some((person) => person.id === plan.userId));
  const activePlans = teamPlans.filter((plan) => !planIsComplete(plan));

  const basicCount = org.filter((p) => p.level === "Basic").length;
  const seniorCount = org.filter((p) => p.level === "Senior").length;

  let onTrack = 0;
  let blockedCount = 0;
  let blockedName: string | null = null;
  let blockedAlert: ProgramBlockedAlert | null = null;

  const matrixRows: ProgramMatrixRow[] = org.map((person) => {
    const plan = teamPlans.find((item) => item.userId === person.id);
    const coaching = coachingByUser[person.id];

    if (!plan) {
      return {
        userId: person.id,
        name: person.fullName,
        initials: initials(person.fullName),
        avatarBg: avatarGradientForId(person.id),
        level: person.level,
        phases: [1, 2, 3, 4].map(() => phaseCell("upcoming")),
        overall: "—",
        overallColor: "#A09D98",
        overallPct: 0,
      };
    }

    const phaseStatuses = [1, 2, 3, 4].map((segment) =>
      segmentPhaseStatus(plan, segment, coaching),
    );
    const hasBlocked = phaseStatuses.includes("blocked");
    const progress = plan.progress;

    if (coaching?.health === "on_track" || coaching?.health === "coach_now") onTrack += 1;
    if (hasBlocked) {
      blockedCount += 1;
      if (!blockedName) blockedName = person.fullName.split(" ")[0] ?? person.fullName;
      if (!blockedAlert) {
        const blockedIdx = phaseStatuses.findIndex((s) => s === "blocked");
        blockedAlert = {
          userId: person.id,
          name: person.fullName,
          phaseLabel: PHASE_LABELS[blockedIdx] ?? "Current phase",
          reason:
            coaching?.avgSimScore !== null && coaching.avgSimScore < 65
              ? "Sim score below 65 threshold. Coaching intervention required before advancing."
              : "Progress stalled on current segment. Review coaching cadence and gate requirements.",
        };
      }
    }

    return {
      userId: person.id,
      name: person.fullName,
      initials: initials(person.fullName),
      avatarBg: avatarGradientForId(person.id),
      level: person.level,
      phases: phaseStatuses.map((status) => phaseCell(status)),
      overall: `${progress}%`,
      overallColor: overallColor(progress, hasBlocked),
      overallPct: progress,
    };
  });

  const avgCompletion =
    teamPlans.length > 0
      ? Math.round(teamPlans.reduce((sum, plan) => sum + plan.progress, 0) / teamPlans.length)
      : 0;

  const certGatesCleared = Object.values(approvedCertCountByUser).reduce((sum, n) => sum + n, 0);
  const certGatesTotal = Math.max(certGatesCleared, org.length * 5);

  const now = new Date();
  const horizon = addDays(now, 60);
  const milestones: ProgramMilestone[] = [];

  for (const person of org) {
    const plan = teamPlans.find((item) => item.userId === person.id);
    if (!plan) continue;

    for (const step of plan.steps) {
      if (!step.dueDate) continue;
      const due = parseISO(step.dueDate);
      if (due > horizon || due < addDays(now, -7)) continue;

      const meta = milestoneStatus(step.dueDate, now);
      const first = person.fullName.split(" ")[0] ?? person.fullName;
      milestones.push({
        date: format(due, "MMM d"),
        isoDate: step.dueDate,
        label: `${first} — ${step.title}`,
        ...meta,
      });
    }
  }

  milestones.sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  return {
    cohortSize: org.length,
    levelSummary: `${basicCount} basic · ${seniorCount} senior`,
    onTrack,
    onTrackPct: org.length > 0 ? Math.round((onTrack / org.length) * 100) : 0,
    blocked: blockedCount,
    blockedName,
    avgCompletion,
    certGatesCleared,
    certGatesTotal,
    blockedAlert,
    matrixRows,
    milestones: milestones.slice(0, 8),
  };
}
