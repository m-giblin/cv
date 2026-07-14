import {
  addDays,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { businessDaysBetween } from "@/lib/plans/business-days";
import {
  PROGRAM_PHASE_DEFINITIONS,
  type PhaseCell,
  type PhaseCellStatus,
} from "@/lib/plans/program-tracker-data";
import type {
  ActivityLog,
  DevelopmentPlan,
  Profile,
  UserPlan,
} from "@/lib/types";
import { initials, uniqueProfiles } from "@/lib/utils";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";

export type ProgramTrackerTab = "cohort" | "programs" | "milestones";

export type MilestoneBucket = "overdue" | "thisWeek" | "upcoming" | "later";

function isOpenMilestone(ms: MilestoneItemView): boolean {
  return ms.stepStatus !== "reviewed" && ms.stepStatus !== "completed";
}

function milestoneDueDay(isoDate: string): Date {
  return startOfDay(parseISO(isoDate));
}

export function classifyMilestoneDueDate(isoDate: string, refDate = new Date()): MilestoneBucket {
  const today = startOfDay(refDate);
  const weekStart = startOfDay(startOfWeek(refDate, { weekStartsOn: 1 }));
  const weekEnd = startOfDay(endOfWeek(refDate, { weekStartsOn: 1 }));
  const horizon = startOfDay(addDays(today, 14));
  const due = milestoneDueDay(isoDate);

  if (due < today) return "overdue";
  if (due >= today && due <= weekEnd) return "thisWeek";
  if (due > weekEnd && due <= horizon) return "upcoming";
  return "later";
}

export const MILESTONE_BUCKET_LABELS: Record<MilestoneBucket, string> = {
  overdue: "Overdue",
  thisWeek: "Due this week",
  upcoming: "Upcoming · next 2 weeks",
  later: "Later",
};

export type PhaseCellView = PhaseCell & { sub: string };

export type CohortRowView = {
  userId: string;
  initials: string;
  name: string;
  level: string;
  day: number;
  avatarBg: string;
  overall: string;
  overallColor: string;
  overallPct: number;
  phases: PhaseCellView[];
};

export type ProgramCardView = {
  id: string;
  name: string;
  subtitle: string;
  type: string;
  typeColor: string;
  pct: number;
  status: string;
  statusColor: string;
  statusBg: string;
  due: string;
  borderColor: string;
};

export type SEProgramsRowView = {
  userId: string;
  initials: string;
  name: string;
  level: string;
  day: number;
  avatarBg: string;
  healthLabel: string;
  healthColor: string;
  healthBg: string;
  programCount: number;
  programs: ProgramCardView[];
};

export type MilestoneItemView = {
  id: string;
  userId: string;
  assignmentId: string;
  assignmentStepId: string;
  stepStatus: string;
  dateShort: string;
  dayOfWeek: string;
  se: string;
  initials: string;
  avatarBg: string;
  label: string;
  program: string;
  daysAway?: string;
  isoDate: string;
};

export type ManagerQueueItemView = {
  id: string;
  userId: string;
  seInitials: string;
  seName: string;
  avatarBg: string;
  title: string;
  actionLabel: string;
  actionStyle: "amber" | "blue";
};

export type SignOffItemView = {
  id: string;
  userId: string;
  seInitials: string;
  seName: string;
  avatarBg: string;
  title: string;
  description: string;
};

export type ProgramStepView = {
  label: string;
  date: string;
  status: "done" | "active" | "blocked" | "upcoming";
  dotBg: string;
  dotBorder: string;
  dotColor: string;
  check: string;
  textColor: string;
  dateColor: string;
  strike: "line-through" | "none";
};

export type DrawerProgramView = {
  name: string;
  type: string;
  typeColor: string;
  pct: number;
  status: string;
  statusColor: string;
  statusBg: string;
  due: string;
  borderColor: string;
  steps: ProgramStepView[];
};

export type ActivityEntryView = {
  label: string;
  program: string;
  date: string;
  dotColor: string;
};

export type DrawerProfileView = {
  userId: string;
  name: string;
  initials: string;
  level: string;
  day: number;
  avatarBg: string;
  healthLabel: string;
  healthColor: string;
  healthBg: string;
  programCount: number;
  overall: string;
  overdueCount: number;
  certsCleared: number;
  programs: DrawerProgramView[];
  activity: ActivityEntryView[];
};

export type ProgramTrackerView = {
  cohortEyebrow: string;
  cohortRows: CohortRowView[];
  sePrograms: SEProgramsRowView[];
  milestonesOverdue: MilestoneItemView[];
  milestonesThisWeek: MilestoneItemView[];
  milestonesUpcoming: MilestoneItemView[];
  milestonesLater: MilestoneItemView[];
  managerQueue: ManagerQueueItemView[];
  signOffItems: SignOffItemView[];
  drawerProfiles: Record<string, DrawerProfileView>;
  stats: {
    activePrograms: number;
    onTrack: number;
    onTrackPct: number;
    atRisk: number;
    overdueItems: number;
    avgCompletion: number;
    certGatesCleared: number;
    certGatesTotal: number;
  };
  overdueCount: number;
};

const PHASE_SUB: Record<PhaseCellStatus, string> = {
  complete: "Signed off",
  active: "On track",
  blocked: "Needs help",
  upcoming: "",
};

function phaseCellView(status: PhaseCellStatus, cell: PhaseCell): PhaseCellView {
  return { ...cell, sub: PHASE_SUB[status] };
}

function dayInRamp(plan?: UserPlan): number {
  if (!plan) return 0;
  const today = new Date().toISOString().slice(0, 10);
  return Math.max(1, businessDaysBetween(plan.startDate, today) + 1);
}

function healthStyle(
  coaching: SeCoachingSummary | undefined,
  progress: number,
  day: number,
  hasBlocked: boolean,
): { label: string; color: string; bg: string } {
  if (hasBlocked || coaching?.health === "at_risk" || coaching?.health === "stalled") {
    return { label: "CRITICAL", color: "#B83128", bg: "rgba(184,49,40,.12)" };
  }
  const expected = Math.round(day * 1.6);
  if (day > 7 && progress < expected * 0.35) {
    return { label: "CRITICAL", color: "#B83128", bg: "rgba(184,49,40,.12)" };
  }
  if (progress > day * 1.15 && day > 0) {
    return { label: "AHEAD", color: "#0071CE", bg: "rgba(0,113,206,.1)" };
  }
  if (progress < Math.max(10, day * 0.75) && day > 14) {
    return { label: "BEHIND", color: "#D4810A", bg: "rgba(212,129,10,.1)" };
  }
  return { label: "ON PACE", color: "#0A6E45", bg: "rgba(10,110,69,.1)" };
}

function programStatusStyle(
  pct: number,
  health: ReturnType<typeof healthStyle>,
): { status: string; statusColor: string; statusBg: string; borderColor: string } {
  if (health.label === "CRITICAL" || pct < 20) {
    return {
      status: "Critical",
      statusColor: "#B83128",
      statusBg: "rgba(184,49,40,.08)",
      borderColor: "rgba(184,49,40,.3)",
    };
  }
  if (health.label === "BEHIND") {
    return {
      status: "Behind",
      statusColor: "#D4810A",
      statusBg: "rgba(212,129,10,.08)",
      borderColor: "rgba(212,129,10,.25)",
    };
  }
  if (health.label === "AHEAD") {
    return { status: "Ahead", statusColor: "#0071CE", statusBg: "rgba(0,113,206,.08)", borderColor: "#E2DFD9" };
  }
  if (pct === 0) {
    return { status: "Not started", statusColor: "#A09D98", statusBg: "#F9F8F6", borderColor: "#E2DFD9" };
  }
  if (pct >= 100) {
    return { status: "Complete", statusColor: "#0A6E45", statusBg: "rgba(10,110,69,.08)", borderColor: "#E2DFD9" };
  }
  return { status: "On track", statusColor: "#0071CE", statusBg: "rgba(0,113,206,.08)", borderColor: "#E2DFD9" };
}

function makeStepView(
  label: string,
  dateIso: string | undefined,
  status: ProgramStepView["status"],
): ProgramStepView {
  const done = status === "done";
  const blocked = status === "blocked";
  const active = status === "active";
  const date = dateIso ? format(parseISO(dateIso), "MMM d") : "—";
  return {
    label,
    date,
    status,
    dotBg: done ? "#0A6E45" : blocked ? "#B83128" : active ? "#0071CE" : "#F9F8F6",
    dotBorder: done ? "#0A6E45" : blocked ? "#B83128" : active ? "#0071CE" : "#D4D1CB",
    dotColor: done || blocked || active ? "#fff" : "#D4D1CB",
    check: done ? "✓" : blocked ? "!" : active ? "→" : "",
    textColor: done ? "#6B6860" : blocked ? "#B83128" : "#0D0E12",
    dateColor: blocked ? "#B83128" : "#A09D98",
    strike: done ? "line-through" : "none",
  };
}

function stepDrawerStatus(
  status: string,
  dueDate?: string,
  now = new Date(),
): ProgramStepView["status"] {
  if (status === "completed" || status === "reviewed") return "done";
  if (!dueDate) return "upcoming";
  const due = parseISO(dueDate);
  if (due < now && status !== "completed" && status !== "reviewed") return "blocked";
  if (status === "in_progress" || status === "submitted" || status === "under_review") return "active";
  return "upcoming";
}

function milestoneFromStep(
  person: Profile,
  plan: UserPlan,
  step: {
    title: string;
    dueDate?: string;
    assignmentStepId?: string;
    status: string;
  },
  segmentIndex?: number | null,
): MilestoneItemView | null {
  if (!step.dueDate || !step.assignmentStepId) return null;
  const due = parseISO(step.dueDate);
  const phaseLabel = segmentIndex ? `Phase ${segmentIndex}` : "Ramp";
  return {
    id: `${plan.id}-${step.assignmentStepId}`,
    userId: person.id,
    assignmentId: plan.id,
    assignmentStepId: step.assignmentStepId,
    stepStatus: step.status,
    dateShort: format(due, "MMM d"),
    dayOfWeek: format(due, "EEE"),
    se: person.fullName,
    initials: initials(person.fullName),
    avatarBg: avatarGradientForId(person.id),
    label: step.title,
    program: `${plan.name} · ${phaseLabel}`,
    isoDate: step.dueDate,
  };
}

export function buildProgramTrackerView({
  org,
  plans,
  coachingByUser,
  approvedCertCountByUser,
  developmentPlans = [],
  activity = [],
  pendingGateSteps = [],
  pendingCertReviews = [],
}: {
  org: Profile[];
  plans: UserPlan[];
  coachingByUser: Record<string, SeCoachingSummary>;
  approvedCertCountByUser: Record<string, number>;
  developmentPlans?: DevelopmentPlan[];
  activity?: ActivityLog[];
  pendingGateSteps?: Array<{ userId: string; title: string; planName: string }>;
  pendingCertReviews?: Array<{ userId: string; personName: string; label: string }>;
}): ProgramTrackerView {
  const teamPlans = plans.filter((plan) => org.some((person) => person.id === plan.userId));
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfDay(startOfWeek(now, { weekStartsOn: 1 }));
  const weekEnd = startOfDay(endOfWeek(now, { weekStartsOn: 1 }));
  const horizon = startOfDay(addDays(today, 14));

  const cohortRows: CohortRowView[] = [];
  const sePrograms: SEProgramsRowView[] = [];
  const drawerProfiles: Record<string, DrawerProfileView> = {};
  const allMilestones: MilestoneItemView[] = [];
  const milestoneIds = new Set<string>();
  const programCards: ProgramCardView[] = [];

  let atRiskPrograms = 0;
  let onTrackPrograms = 0;

  for (const person of uniqueProfiles(org)) {
    const plan = teamPlans.find((item) => item.userId === person.id);
    const coaching = coachingByUser[person.id];
    const devPlan = developmentPlans.find((item) => item.userId === person.id);
    const day = dayInRamp(plan);
    const progress = plan?.progress ?? 0;

    const phaseStatuses: PhaseCellStatus[] = plan
      ? [1, 2, 3, 4].map((segment) => {
          const unlocked = plan.unlockedSegmentMax ?? 1;
          const steps = plan.steps.filter((step) => (step.segmentIndex ?? 1) === segment);
          if (segment > unlocked) return "upcoming";
          const allDone =
            steps.length > 0 &&
            steps.every((step) => step.status === "reviewed" || step.status === "completed");
          if (allDone) return "complete";
          const avgSim = coaching?.avgSimScore ?? null;
          const blocked =
            segment === unlocked &&
            ((avgSim !== null && avgSim < 65) ||
              coaching?.health === "at_risk" ||
              coaching?.health === "stalled");
          if (blocked) return "blocked";
          return "active";
        })
      : ["upcoming", "upcoming", "upcoming", "upcoming"];

    const hasBlocked = phaseStatuses.includes("blocked");
    const health = healthStyle(coaching, progress, day, hasBlocked);
    const overallColor = hasBlocked ? "#B83128" : progress >= 70 ? "#0071CE" : health.color;

    const phases: PhaseCellView[] = phaseStatuses.map((status, index) => {
      const base = {
        complete: { bg: "#EDFAF3", icon: "✓", textColor: "#0A6E45", label: "Complete" },
        active: { bg: "#F0F7FF", icon: "→", textColor: "#0071CE", label: "In progress" },
        blocked: { bg: "#FEF0EE", icon: "!", textColor: "#B83128", label: "Blocked" },
        upcoming: { bg: "#F9F8F6", icon: "○", textColor: "#A09D98", label: "Upcoming" },
      }[status];
      return phaseCellView(status, { status, ...base });
    });

    cohortRows.push({
      userId: person.id,
      initials: initials(person.fullName),
      name: person.fullName,
      level: person.level,
      day,
      avatarBg: avatarGradientForId(person.id),
      overall: plan ? `${progress}%` : "—",
      overallColor: plan ? overallColor : "#A09D98",
      overallPct: progress,
      phases,
    });

    const personPrograms: ProgramCardView[] = [];

    if (plan) {
      const rampStyle = programStatusStyle(progress, health);
      const rampCard: ProgramCardView = {
        id: `${person.id}-ramp`,
        name: plan.name,
        subtitle: "SE onboarding program",
        type: "Onboarding",
        typeColor: rampStyle.statusColor === "#B83128" ? "#B83128" : "#0071CE",
        pct: progress,
        ...rampStyle,
        due: plan.targetCompletion ? format(parseISO(plan.targetCompletion), "MMM d") : "—",
      };
      personPrograms.push(rampCard);
      programCards.push(rampCard);
      if (rampStyle.status === "On track" || rampStyle.status === "Ahead" || rampStyle.status === "Complete") {
        onTrackPrograms += 1;
      } else {
        atRiskPrograms += 1;
      }

      for (const step of plan.steps) {
        const ms = milestoneFromStep(person, plan, step, step.segmentIndex);
        if (ms && !milestoneIds.has(ms.id)) {
          milestoneIds.add(ms.id);
          allMilestones.push(ms);
        }
      }
    }

    if (devPlan) {
      const devPct =
        devPlan.goals.length > 0
          ? Math.round(
              (devPlan.goals.filter((g) => g.overallStatus === "achieved" || g.overallStatus === "on_track")
                .length /
                devPlan.goals.length) *
                100,
            )
          : 0;
      const devStyle = programStatusStyle(devPct, health);
      const devCard: ProgramCardView = {
        id: `${person.id}-dev`,
        name: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} Dev Goals`,
        subtitle: "Annual development plan",
        type: "Dev Plan",
        typeColor: "#D4810A",
        pct: devPct,
        ...devStyle,
        due: `Dec ${devPlan.year}`,
      };
      personPrograms.push(devCard);
      programCards.push(devCard);
      if (devStyle.status === "On track" || devStyle.status === "Ahead") onTrackPrograms += 1;
      else atRiskPrograms += 1;
    }

    const certs = approvedCertCountByUser[person.id] ?? 0;
    if (certs > 0 || person.level !== "Basic") {
      const certPct = Math.min(100, Math.round((certs / 8) * 100));
      const certStyle = programStatusStyle(certPct, health);
      const certCard: ProgramCardView = {
        id: `${person.id}-cert`,
        name: "Certification track",
        subtitle: "Core certification progress",
        type: "Certification",
        typeColor: "#0A6E45",
        pct: certPct,
        status: certPct >= 50 ? "On track" : "In progress",
        statusColor: certPct >= 50 ? "#0A6E45" : "#0071CE",
        statusBg: certPct >= 50 ? "rgba(10,110,69,.08)" : "rgba(0,113,206,.08)",
        borderColor: "#E2DFD9",
        due: "Ongoing",
      };
      personPrograms.push(certCard);
      programCards.push(certCard);
      onTrackPrograms += 1;
    }

    sePrograms.push({
      userId: person.id,
      initials: initials(person.fullName),
      name: person.fullName,
      level: `${person.level} SE`,
      day,
      avatarBg: avatarGradientForId(person.id),
      healthLabel: health.label,
      healthColor: health.color,
      healthBg: health.bg,
      programCount: personPrograms.length,
      programs: personPrograms,
    });

    const overdueForPerson = allMilestones.filter(
      (ms) =>
        ms.userId === person.id && isOpenMilestone(ms) && milestoneDueDay(ms.isoDate) < today,
    ).length;

    const drawerPrograms: DrawerProgramView[] = [];
    if (plan) {
      const rampStyle = programStatusStyle(progress, health);
      drawerPrograms.push({
        name: plan.name,
        type: "Onboarding",
        typeColor: "#0071CE",
        pct: progress,
        status: rampStyle.status,
        statusColor: rampStyle.statusColor,
        statusBg: rampStyle.statusBg,
        due: plan.targetCompletion ? format(parseISO(plan.targetCompletion), "MMM d") : "—",
        borderColor: rampStyle.borderColor,
        steps: plan.steps.slice(0, 8).map((step) =>
          makeStepView(step.title, step.dueDate, stepDrawerStatus(step.status, step.dueDate, now)),
        ),
      });
    }
    if (devPlan && devPlan.goals.length > 0) {
      const devPct = Math.round(
        (devPlan.goals.filter((g) => g.overallStatus === "achieved" || g.overallStatus === "on_track").length /
          devPlan.goals.length) *
          100,
      );
      drawerPrograms.push({
        name: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} Dev Goals`,
        type: "Dev Plan",
        typeColor: "#D4810A",
        pct: devPct,
        status: "On track",
        statusColor: "#D4810A",
        statusBg: "rgba(212,129,10,.08)",
        due: `Dec ${devPlan.year}`,
        borderColor: "#E2DFD9",
        steps: devPlan.goals.slice(0, 5).map((goal) =>
          makeStepView(
            goal.title,
            undefined,
            goal.overallStatus === "achieved"
              ? "done"
              : goal.overallStatus === "at_risk"
                ? "blocked"
                : "upcoming",
          ),
        ),
      });
    }

    const personActivity = activity
      .filter((entry) => entry.userId === person.id)
      .slice(0, 5)
      .map((entry) => ({
        label: entry.title,
        program: plan?.name ?? "Program",
        date: format(parseISO(entry.createdAt), "MMM d"),
        dotColor: entry.eventType.includes("completed") ? "#0A6E45" : "#0071CE",
      }));

    if (personActivity.length === 0 && plan) {
      const lastStep = plan.steps.find((s) => s.status === "reviewed" || s.status === "completed");
      if (lastStep) {
        personActivity.push({
          label: `Completed ${lastStep.title}`,
          program: plan.name,
          date: lastStep.dueDate ? format(parseISO(lastStep.dueDate), "MMM d") : "—",
          dotColor: "#0A6E45",
        });
      }
    }

    drawerProfiles[person.id] = {
      userId: person.id,
      name: person.fullName,
      initials: initials(person.fullName),
      level: `${person.level} SE`,
      day,
      avatarBg: avatarGradientForId(person.id),
      healthLabel: health.label,
      healthColor: health.color,
      healthBg: health.bg,
      programCount: personPrograms.length,
      overall: plan ? `${progress}%` : "—",
      overdueCount: overdueForPerson,
      certsCleared: certs,
      programs: drawerPrograms,
      activity: personActivity,
    };
  }

  const milestonesOverdue = allMilestones
    .filter((ms) => isOpenMilestone(ms) && milestoneDueDay(ms.isoDate) < today)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const milestonesThisWeek = allMilestones
    .filter((ms) => {
      if (!isOpenMilestone(ms)) return false;
      const due = milestoneDueDay(ms.isoDate);
      return due >= today && due <= weekEnd;
    })
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const milestonesUpcoming = allMilestones
    .filter((ms) => {
      if (!isOpenMilestone(ms)) return false;
      const due = milestoneDueDay(ms.isoDate);
      return due > weekEnd && due <= horizon;
    })
    .map((ms) => ({
      ...ms,
      daysAway: `in ${Math.ceil((milestoneDueDay(ms.isoDate).getTime() - today.getTime()) / 86_400_000)}d`,
    }))
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const milestonesLater = allMilestones
    .filter((ms) => {
      if (!isOpenMilestone(ms)) return false;
      return milestoneDueDay(ms.isoDate) > horizon;
    })
    .map((ms) => ({
      ...ms,
      daysAway: `in ${Math.ceil((milestoneDueDay(ms.isoDate).getTime() - today.getTime()) / 86_400_000)}d`,
    }))
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const managerQueue: ManagerQueueItemView[] = [];
  for (const gate of pendingGateSteps) {
    const person = org.find((p) => p.id === gate.userId);
    if (!person) continue;
    managerQueue.push({
      id: `gate-${gate.userId}-${gate.title}`,
      userId: gate.userId,
      seInitials: initials(person.fullName),
      seName: person.fullName.split(" ")[0] ?? person.fullName,
      avatarBg: avatarGradientForId(person.id),
      title: `${person.fullName.split(" ")[0]} — ${gate.title} sign-off pending`,
      actionLabel: "Sign off →",
      actionStyle: "amber",
    });
  }
  for (const cert of pendingCertReviews) {
    const person = org.find((p) => p.id === cert.userId);
    if (!person) continue;
    managerQueue.push({
      id: `cert-${cert.userId}`,
      userId: cert.userId,
      seInitials: initials(person.fullName),
      seName: person.fullName.split(" ")[0] ?? person.fullName,
      avatarBg: avatarGradientForId(person.id),
      title: `${person.fullName.split(" ")[0]} — ${cert.label} needs review`,
      actionLabel: "Review →",
      actionStyle: "blue",
    });
  }

  const signOffItems: SignOffItemView[] = managerQueue.map((item) => ({
    id: item.id,
    userId: item.userId,
    seInitials: item.seInitials,
    seName: item.seName,
    avatarBg: item.avatarBg,
    title: item.title,
    description:
      item.actionStyle === "amber"
        ? "Segment gate completion pending manager sign-off. Approve to unlock the next phase."
        : "Certification submission awaiting manager review and approval.",
  }));

  const avgCompletion =
    teamPlans.length > 0
      ? Math.round(teamPlans.reduce((sum, plan) => sum + plan.progress, 0) / teamPlans.length)
      : 0;

  const certGatesCleared = Object.values(approvedCertCountByUser).reduce((sum, n) => sum + n, 0);
  const certGatesTotal = Math.max(certGatesCleared, org.length * 5);

  const basicCount = org.filter((p) => p.level === "Basic").length;
  const seniorCount = org.filter((p) => p.level === "Senior" || p.level === "Advisory").length;

  return {
    cohortEyebrow: `${org.length} SE${org.length === 1 ? "" : "s"} · ${basicCount} basic · ${seniorCount} senior`,
    cohortRows,
    sePrograms,
    milestonesOverdue,
    milestonesThisWeek,
    milestonesUpcoming,
    milestonesLater,
    managerQueue,
    signOffItems,
    drawerProfiles,
    stats: {
      activePrograms: programCards.length,
      onTrack: onTrackPrograms,
      onTrackPct: programCards.length > 0 ? Math.round((onTrackPrograms / programCards.length) * 100) : 0,
      atRisk: atRiskPrograms,
      overdueItems: milestonesOverdue.length,
      avgCompletion,
      certGatesCleared,
      certGatesTotal,
    },
    overdueCount: milestonesOverdue.length,
  };
}

export { PROGRAM_PHASE_DEFINITIONS };
