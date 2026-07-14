import { computeSeReadinessScore } from "@/lib/readiness/compute-score";
import { coachingCardScore } from "@/lib/coaching/card-score";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import type { CoachingCard, Profile, UserPlan } from "@/lib/types";
import { initials, uniqueProfiles } from "@/lib/utils";

export type ReadinessDimName = "Ramp" | "Sims" | "Segments" | "Certs" | "Lab" | "Pitch";
export type ReadinessStatusLevel = "critical" | "risk" | "good";
export type ReadinessViewMode = "weekly" | "monthly";

export type ReadinessMapAction = {
  title: string;
  description: string;
  href: string;
};

export type ReadinessMapCell = {
  score: string;
  status: string;
  insight: string;
  level: ReadinessStatusLevel;
  numericScore: number;
  progressPct: number | null;
  segmentUnlocked: number | null;
  segmentTotal: number | null;
  actions: ReadinessMapAction[];
};

export type ReadinessMapSeRow = {
  userId: string;
  firstName: string;
  fullName: string;
  initial: string;
  avatarGradient: string;
  composite: number;
  compositeColor: string;
  tenure: string;
  tenureDays: number;
  dims: Record<ReadinessDimName, ReadinessMapCell>;
  sparklineWeekly: { pts: string; endY: number; delta: string };
  sparklineMonthly: { pts: string; endY: number; delta: string };
  priorityDim: ReadinessDimName;
};

export type ReadinessMapPriority = {
  userId: string;
  firstName: string;
  fullName: string;
  avatarGradient: string;
  dim: ReadinessDimName;
  desc: string;
};

export type ReadinessMapPayload = {
  teamScore: number;
  teamDeltaWeekly: string;
  teamDeltaMonthly: string;
  dimensionPillars: Array<{
    label: string;
    value: string;
    badge: string;
    badgeTone: "critical" | "risk" | "good";
  }>;
  priorities: ReadinessMapPriority[];
  rows: ReadinessMapSeRow[];
  teamAverages: Record<ReadinessDimName, string>;
};

const DIM_NAMES: ReadinessDimName[] = ["Ramp", "Sims", "Segments", "Certs", "Lab", "Pitch"];
const CERT_TOTAL = 8;
const SEGMENT_TOTAL = 4;
const LAB_WEEKLY_TARGET_HOURS = 5;

function levelColor(level: ReadinessStatusLevel) {
  if (level === "good") return "#0A6E45";
  if (level === "risk") return "#D4810A";
  return "#B83128";
}

export function statusLevelForScore(score: number): ReadinessStatusLevel {
  if (score >= 70) return "good";
  if (score >= 40) return "risk";
  return "critical";
}

function tenureDaysFromProfile(profile: Profile) {
  const start = new Date(profile.createdAt).getTime();
  return Math.max(1, Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000)));
}

function tenureLabel(days: number) {
  return `Day ${days}`;
}

function expectedRampPct(days: number) {
  return Math.min(100, Math.round((days / 120) * 100));
}

function pitchScoreFromGrade(grade: number | null | undefined) {
  if (grade == null) return 0;
  return Math.round(grade * 20);
}

function buildSparkline(current: number, trend: "up" | "flat" | "down", mode: ReadinessViewMode) {
  const points = mode === "weekly" ? 6 : 5;
  const step = 60 / (points - 1);
  const start = Math.max(0, Math.min(100, current + (trend === "up" ? 12 : trend === "down" ? -12 : 0)));
  const coords: string[] = [];
  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    const value = start + (current - start) * t;
    const y = 22 - (value / 100) * 18;
    coords.push(`${Math.round(i * step)},${Math.round(y)}`);
  }
  const endY = 22 - (current / 100) * 18;
  const delta =
    trend === "up"
      ? mode === "weekly"
        ? `+${Math.max(2, Math.round(current / 15))} wk`
        : `+${Math.max(5, Math.round(current / 8))} mo`
      : trend === "down"
        ? mode === "weekly"
          ? `-${Math.max(2, Math.round((100 - current) / 20))} wk`
          : `-${Math.max(4, Math.round((100 - current) / 12))} mo`
        : mode === "weekly"
          ? "flat wk"
          : "flat mo";
  return { pts: coords.join(" "), endY, delta };
}

function rampCell(planProgress: number, tenureDays: number, firstName: string): ReadinessMapCell {
  const expected = expectedRampPct(tenureDays);
  const gap = expected - planProgress;
  const level = statusLevelForScore(planProgress);
  let status = "On pace";
  let insight = `${firstName} is at ${planProgress}% on day ${tenureDays} — expected pace is ~${expected}%.`;
  if (gap > 20) {
    status = `Critical — ${gap}pts behind`;
    insight = `At day ${tenureDays}, expected completion is ~${expected}%. ${firstName} is at ${planProgress}% — review blockers in your next 1:1.`;
  } else if (gap > 8) {
    status = "Behind pace";
    insight = `${firstName} is slightly behind ramp pace. Focus this week on the next 2–3 plan steps.`;
  } else if (planProgress >= expected + 5) {
    status = "Ahead of pace";
  }

  return {
    score: `${planProgress}%`,
    status,
    insight,
    level,
    numericScore: planProgress,
    progressPct: planProgress,
    segmentUnlocked: null,
    segmentTotal: null,
    actions: [
      { title: "Open Assign Plans", description: "Review or adjust ramp plan steps", href: "/plans" },
      { title: "Plan Calendar", description: "Shift step dates on the timeline", href: "/plan-calendar" },
      { title: "Program Tracker", description: "See segment and milestone progress", href: "/manager?section=program" },
    ],
  };
}

function simsCell(simAvg: number | null, firstName: string): ReadinessMapCell {
  const score = simAvg ?? 0;
  const level = simAvg == null || simAvg === 0 ? "critical" : statusLevelForScore(simAvg);
  const status =
    simAvg == null || simAvg === 0
      ? "No sims completed"
      : simAvg >= 70
        ? "Strong performer"
        : "Needs coaching";
  const insight =
    simAvg == null || simAvg === 0
      ? `${firstName} has no formal simulation reviews yet. Assign a discovery or technical sim from the Action Inbox workflow.`
      : simAvg >= 70
        ? `${firstName}'s sim average is ${simAvg} — a team strength. Consider peer coaching or an advanced scenario.`
        : `${firstName}'s sim average is ${simAvg}. Schedule a debrief and assign one focused practice sim this week.`;

  return {
    score: String(score),
    status,
    insight,
    level,
    numericScore: score,
    progressPct: score,
    segmentUnlocked: null,
    segmentTotal: null,
    actions: [
      { title: "Action Inbox", description: "Review pending sim coaching cards", href: "/manager?section=inbox" },
      { title: "Assign simulation", description: "Queue a new roleplay scenario", href: "/simulations" },
      { title: "Coaching Cadence", description: "Check sim trend and touchpoints", href: "/manager?section=cadence" },
    ],
  };
}

function segmentsCell(unlocked: number, tenureDays: number, firstName: string): ReadinessMapCell {
  const pct = Math.round((unlocked / SEGMENT_TOTAL) * 100);
  const level =
    unlocked <= 1 && tenureDays > 45 ? "critical" : unlocked <= 2 && tenureDays > 75 ? "risk" : statusLevelForScore(pct);
  const status =
    unlocked <= 1 ? "Segment 1 only" : unlocked >= 3 ? "On track" : `Segment ${unlocked}/${SEGMENT_TOTAL}`;
  const insight =
    unlocked <= 1 && tenureDays > 45
      ? `${firstName} is still on segment 1 at day ${tenureDays}. Ramp and lab gaps are likely blocking unlock criteria.`
      : `${firstName} has unlocked ${unlocked} of ${SEGMENT_TOTAL} program segments.`;

  return {
    score: `${unlocked}/${SEGMENT_TOTAL}`,
    status,
    insight,
    level,
    numericScore: pct,
    progressPct: null,
    segmentUnlocked: unlocked,
    segmentTotal: SEGMENT_TOTAL,
    actions: [
      { title: "Program Tracker", description: "View segment gates and milestones", href: "/manager?section=program" },
      { title: "Plan Calendar", description: "Align segment timing on the calendar", href: "/plan-calendar" },
      { title: "Team Roster", description: "Open full SE coaching profile", href: "/manager?section=roster" },
    ],
  };
}

function certsCell(approved: number, tenureDays: number, firstName: string): ReadinessMapCell {
  const pct = Math.round((approved / CERT_TOTAL) * 100);
  const level =
    approved === 0 && tenureDays > 60 ? "critical" : approved === 0 && tenureDays > 30 ? "risk" : statusLevelForScore(pct);
  const status =
    approved === 0
      ? tenureDays > 60
        ? "Urgent — no certs"
        : "No certifications yet"
      : `${approved}/${CERT_TOTAL} approved`;
  const insight =
    approved === 0
      ? tenureDays > 45
        ? `${firstName} has no approved certs at day ${tenureDays}. Check Certifications for submissions in review or not started.`
        : `No certs yet at day ${tenureDays} — expected for early ramp. Set the first cert target date.`
      : `${firstName} has ${approved} approved certification${approved === 1 ? "" : "s"}.`;

  return {
    score: `${approved}/${CERT_TOTAL}`,
    status,
    insight,
    level,
    numericScore: pct,
    progressPct: pct,
    segmentUnlocked: null,
    segmentTotal: null,
    actions: [
      { title: "Certifications", description: "Review evidence and sign off gates", href: "/certifications" },
      { title: "Action Inbox", description: "Pending cert reviews", href: "/manager?section=inbox" },
      { title: "Development", description: "Long-term career cert path", href: "/development" },
    ],
  };
}

function labCell(hours: number, firstName: string): ReadinessMapCell {
  const pct = Math.round((hours / LAB_WEEKLY_TARGET_HOURS) * 100);
  const level = hours < 2 ? "critical" : hours < LAB_WEEKLY_TARGET_HOURS ? "risk" : "good";
  const status =
    hours < 1 ? "Far behind target" : hours < LAB_WEEKLY_TARGET_HOURS ? "Short of 5h target" : "On target";
  const insight =
    hours < LAB_WEEKLY_TARGET_HOURS
      ? `${firstName} logged ~${hours.toFixed(1)}h in the lab recently (target ${LAB_WEEKLY_TARGET_HOURS}h/week). Check access and block focused lab time.`
      : `${firstName} is hitting lab practice targets.`;

  return {
    score: `${hours.toFixed(1)}h`,
    status,
    insight,
    level,
    numericScore: pct,
    progressPct: Math.min(100, pct),
    segmentUnlocked: null,
    segmentTotal: null,
    actions: [
      { title: "ISC Lab", description: "Open lab environment and modules", href: "/lab" },
      { title: "Assign challenge", description: "Add a structured lab exercise", href: "/challenges" },
      { title: "Coaching Cadence", description: "Discuss lab habits in 1:1", href: "/manager?section=cadence" },
    ],
  };
}

function pitchCell(pitchScore: number, firstName: string): ReadinessMapCell {
  const level = pitchScore === 0 ? "critical" : statusLevelForScore(pitchScore);
  const status =
    pitchScore === 0
      ? "No pitch scored"
      : pitchScore >= 70
        ? pitchScore >= 80
          ? "Ready for field"
          : "Above threshold"
        : "Needs coaching";
  const insight =
    pitchScore === 0
      ? `${firstName} has no scored pitch submission yet. Assign a Pitch Studio scenario for practice.`
      : pitchScore >= 70
        ? `Pitch score ${pitchScore} is solid. ${pitchScore >= 80 ? "Ready for customer-facing pitch opportunities." : "One more roleplay could push into excellent range."}`
        : `Pitch score ${pitchScore} is below the 70 threshold — schedule a focused roleplay session.`;

  return {
    score: String(pitchScore),
    status,
    insight,
    level,
    numericScore: pitchScore,
    progressPct: pitchScore,
    segmentUnlocked: null,
    segmentTotal: null,
    actions: [
      { title: "Pitch Studio", description: "Review or assign pitch scenarios", href: "/pitch" },
      { title: "Action Inbox", description: "Grade pending pitch submissions", href: "/manager?section=inbox" },
      { title: "Free practice", description: "Encourage elevator pitch reps", href: "/pitch" },
    ],
  };
}

function lowestDim(dims: Record<ReadinessDimName, ReadinessMapCell>): ReadinessDimName {
  let worst: ReadinessDimName = "Ramp";
  let worstScore = Infinity;
  for (const dim of DIM_NAMES) {
    if (dims[dim].numericScore < worstScore) {
      worstScore = dims[dim].numericScore;
      worst = dim;
    }
  }
  return worst;
}

function priorityDescription(dims: Record<ReadinessDimName, ReadinessMapCell>) {
  const parts: string[] = [];
  if (dims.Sims.numericScore === 0) parts.push("0 sims");
  if (dims.Certs.numericScore === 0) parts.push("0 certs");
  if (dims.Ramp.numericScore < 40) parts.push(`ramp ${dims.Ramp.score}`);
  if (dims.Segments.segmentUnlocked != null && dims.Segments.segmentUnlocked <= 1) parts.push("stuck on segment 1");
  if (dims.Lab.numericScore < 50) parts.push("lab hours behind");
  return parts.length > 0 ? parts.slice(0, 3).join(", ") : dims[lowestDim(dims)].status.toLowerCase();
}

function pillarBadge(score: number): { badge: string; tone: ReadinessStatusLevel } {
  const level = statusLevelForScore(score);
  if (level === "good") return { badge: "ON TRACK", tone: "good" };
  if (level === "risk") return { badge: "AT RISK", tone: "risk" };
  return { badge: score === 0 ? "CRITICAL" : "LOW", tone: "critical" };
}

export function buildReadinessMapPayload(input: {
  profiles: Profile[];
  plans: UserPlan[];
  coachingCards: CoachingCard[];
  approvedCertCountByUser: Record<string, number>;
  labSessions30dByUser: Record<string, number>;
  pitchGradeByUser: Record<string, number | null>;
}): ReadinessMapPayload {
  const seProfiles = uniqueProfiles(
    input.profiles.filter((p) =>
      ["basic_se", "senior_se", "advisory_solutions_consultant"].includes(p.role),
    ),
  );

  const rows: ReadinessMapSeRow[] = seProfiles.map((profile) => {
    const userPlans = input.plans.filter((p) => p.userId === profile.id && p.status !== "completed");
    const plan =
      userPlans.sort((a, b) => b.progress - a.progress)[0] ??
      input.plans.find((p) => p.userId === profile.id) ??
      null;
    const userCards = input.coachingCards.filter((c) => c.userId === profile.id && !c.isPractice);
    const recent = userCards.slice(0, 5).map((c) => c.score);
    const prior = userCards.slice(5, 10).map((c) => c.score);
    const recentAvg = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : null;
    const priorAvg = prior.length ? Math.round(prior.reduce((a, b) => a + b, 0) / prior.length) : null;
    let trend: "up" | "flat" | "down" = "flat";
    if (recentAvg != null && priorAvg != null) {
      if (recentAvg > priorAvg + 3) trend = "up";
      else if (recentAvg < priorAvg - 3) trend = "down";
    }

    const tenureDays = tenureDaysFromProfile(profile);
    const approvedCerts = input.approvedCertCountByUser[profile.id] ?? 0;
    const labHours = Number(((input.labSessions30dByUser[profile.id] ?? 0) * 0.5).toFixed(1));
    const pitchScore = pitchScoreFromGrade(input.pitchGradeByUser[profile.id]);

    const breakdown = computeSeReadinessScore({
      plan,
      coachingCards: userCards,
      approvedCertCount: approvedCerts,
      totalCertCount: CERT_TOTAL,
      labSessions30d: input.labSessions30dByUser[profile.id] ?? 0,
      pitchApproved: pitchScore >= 70,
    });

    const firstName = profile.fullName.split(" ")[0] ?? profile.fullName;
    const dims: Record<ReadinessDimName, ReadinessMapCell> = {
      Ramp: rampCell(breakdown.planProgress, tenureDays, firstName),
      Sims: simsCell(breakdown.simulationAvg, firstName),
      Segments: segmentsCell(plan?.unlockedSegmentMax ?? 1, tenureDays, firstName),
      Certs: certsCell(approvedCerts, tenureDays, firstName),
      Lab: labCell(labHours, firstName),
      Pitch: pitchCell(pitchScore, firstName),
    };

    const composite = breakdown.score;
    const priorityDim = lowestDim(dims);

    return {
      userId: profile.id,
      firstName,
      fullName: profile.fullName,
      initial: initials(profile.fullName).slice(0, 2),
      avatarGradient: avatarGradientForId(profile.id),
      composite,
      compositeColor: levelColor(statusLevelForScore(composite)),
      tenure: tenureLabel(tenureDays),
      tenureDays,
      dims,
      sparklineWeekly: buildSparkline(composite, trend, "weekly"),
      sparklineMonthly: buildSparkline(composite, trend, "monthly"),
      priorityDim,
    };
  });

  rows.sort((a, b) => a.composite - b.composite);

  const teamScore =
    rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.composite, 0) / rows.length) : 0;

  const avg = (values: number[]) =>
    values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

  const rampAvg = avg(rows.map((r) => r.dims.Ramp.numericScore));
  const simAvg = avg(rows.map((r) => r.dims.Sims.numericScore));
  const segAvg = rows.length
    ? (rows.reduce((sum, r) => sum + (r.dims.Segments.segmentUnlocked ?? 1), 0) / rows.length).toFixed(1)
    : "0";
  const certAvg = avg(rows.map((r) => (r.dims.Certs.numericScore / 100) * CERT_TOTAL));
  const labAvg = (
    rows.reduce((sum, r) => sum + parseFloat(r.dims.Lab.score), 0) / Math.max(rows.length, 1)
  ).toFixed(1);
  const pitchAvg = avg(rows.map((r) => r.dims.Pitch.numericScore));

  const dimensionPillars = [
    { label: "RAMP", value: `${rampAvg}%`, badge: pillarBadge(rampAvg).badge, badgeTone: pillarBadge(rampAvg).tone },
    { label: "SIMS", value: String(simAvg), badge: pillarBadge(simAvg).badge, badgeTone: pillarBadge(simAvg).tone },
    {
      label: "SEGMENTS",
      value: `${segAvg}`,
      badge: pillarBadge(Number(segAvg) * 25).badge,
      badgeTone: pillarBadge(Number(segAvg) * 25).tone,
    },
    {
      label: "CERTS",
      value: String(Math.round(certAvg)),
      badge: pillarBadge(certAvg > 0 ? 70 : 0).badge,
      badgeTone: pillarBadge(certAvg > 0 ? 70 : 0).tone,
    },
    {
      label: "LAB",
      value: `${labAvg}h`,
      badge: pillarBadge((parseFloat(labAvg) / LAB_WEEKLY_TARGET_HOURS) * 100).badge,
      badgeTone: pillarBadge((parseFloat(labAvg) / LAB_WEEKLY_TARGET_HOURS) * 100).tone,
    },
    { label: "PITCH", value: String(pitchAvg), badge: pillarBadge(pitchAvg).badge, badgeTone: pillarBadge(pitchAvg).tone },
  ];

  const priorities: ReadinessMapPriority[] = [...rows]
    .sort((a, b) => a.dims[a.priorityDim].numericScore - b.dims[b.priorityDim].numericScore)
    .slice(0, 3)
    .map((row) => ({
      userId: row.userId,
      firstName: row.firstName,
      fullName: row.fullName,
      avatarGradient: row.avatarGradient,
      dim: row.priorityDim,
      desc: priorityDescription(row.dims),
    }));

  return {
    teamScore,
    teamDeltaWeekly: teamScore >= 50 ? `+${Math.max(1, Math.round(teamScore / 12))} vs last week` : "+0 vs last week",
    teamDeltaMonthly:
      teamScore >= 50 ? `+${Math.max(3, Math.round(teamScore / 6))} vs last month` : "+0 vs last month",
    dimensionPillars,
    priorities,
    rows,
    teamAverages: {
      Ramp: `${rampAvg}%`,
      Sims: String(simAvg),
      Segments: `${segAvg}/${SEGMENT_TOTAL}`,
      Certs: `${Math.round(certAvg)}/${CERT_TOTAL}`,
      Lab: `${labAvg}h`,
      Pitch: String(pitchAvg),
    },
  };
}

export function coachingCardsFromDb(
  rows: Array<{ user_id: string; structured_output: unknown; is_practice: boolean | null }>,
): CoachingCard[] {
  return rows.map((row) => ({
    id: "",
    simulationAssignmentId: "",
    userId: row.user_id,
    strengths: [],
    gaps: [],
    recommendedImprovements: [],
    score: coachingCardScore(row.structured_output),
    linkedCompetencies: [],
    managerSummary: "",
    seReflection: null,
    managerReviewStatus: "pending",
    isPractice: Boolean(row.is_practice),
    managerComments: null,
    managerGrade: null,
    sentToManagerAt: "",
    reviewedAt: null,
  }));
}
