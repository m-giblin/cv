import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import {
  addCalendarDays,
  businessDaysBetween,
  calendarDaysBetween,
} from "@/lib/plans/business-days";
import type { CalendarPlanRow, CalendarStep } from "@/lib/plans/plan-calendar-data";
import { filterStepsForMentor } from "@/lib/plans/plan-calendar-data";
import type { Profile, UserPlan } from "@/lib/types";
import { initials } from "@/lib/utils";

export const GANTT_DAY_PX = 26;
export const GANTT_LABEL_WIDTH = 200;
export const GANTT_TOTAL_DAYS = 120;

export type GanttBarType = "content" | "challenge" | "sim" | "mentor" | "gate";
export type GanttHealth = "critical" | "behind" | "on-pace" | "ahead";

export type GanttBar = {
  id: string;
  assignmentId: string;
  assignmentStepId?: string;
  type: GanttBarType;
  label: string;
  startDay: number;
  days?: number;
  pct?: number;
};

export type GanttBarLayout = GanttBar & {
  lane: number;
  track: "content" | "secondary" | "gate";
  topPx: number;
  heightPx: number;
};

export type GanttRowLayout = {
  bars: GanttBarLayout[];
  rowHeightPx: number;
};

const LANE_H_CONTENT = 18;
const LANE_H_SECONDARY = 14;
const LANE_GAP = 3;
const ROW_PAD_TOP = 8;
const ROW_PAD_BOTTOM = 8;
const MIN_ROW_HEIGHT = 80;

export type GanttSeRow = {
  id: string;
  userId: string;
  assignmentId: string;
  name: string;
  initials: string;
  avatarBg: string;
  health: GanttHealth;
  healthLabel: string;
  healthColor: string;
  healthBg: string;
  rampPct: number;
  dayInRamp: number;
  mentor: string | null;
  planName: string;
  bars: GanttBar[];
};

const HEALTH_STYLES: Record<
  GanttHealth,
  { label: string; color: string; bg: string }
> = {
  critical: { label: "CRITICAL", color: "#B83128", bg: "rgba(184,49,40,.12)" },
  behind: { label: "BEHIND", color: "#D4810A", bg: "rgba(212,129,10,.1)" },
  "on-pace": { label: "ON PACE", color: "#0A6E45", bg: "rgba(10,110,69,.1)" },
  ahead: { label: "AHEAD", color: "#0071CE", bg: "rgba(0,113,206,.1)" },
};

function mapStepType(step: CalendarStep): GanttBarType {
  if (step.isGate) return "gate";
  switch (step.type) {
    case "challenge":
      return "challenge";
    case "simulation":
      return "sim";
    case "mentor_review":
      return "mentor";
    default:
      return "content";
  }
}

function barDuration(type: GanttBarType): number {
  switch (type) {
    case "content":
      return 4;
    case "challenge":
      return 3;
    case "sim":
      return 2;
    case "mentor":
      return 1;
    default:
      return 1;
  }
}

function barEndDay(bar: GanttBar): number {
  if (bar.type === "gate") return bar.startDay;
  return bar.startDay + (bar.days ?? 1);
}

function assignLanes(bars: GanttBar[]): Map<string, number> {
  const sorted = [...bars].sort(
    (a, b) => a.startDay - b.startDay || barEndDay(a) - barEndDay(b),
  );
  const laneEnds: number[] = [];
  const result = new Map<string, number>();

  for (const bar of sorted) {
    const end = barEndDay(bar);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= bar.startDay);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    result.set(bar.id, lane);
  }

  return result;
}

/** Stack overlapping bars into lanes and compute per-row height. */
export function layoutGanttRow(bars: GanttBar[]): GanttRowLayout {
  const gates = bars.filter((bar) => bar.type === "gate");
  const content = bars.filter((bar) => bar.type === "content");
  const secondary = bars.filter((bar) => bar.type !== "gate" && bar.type !== "content");

  const contentLanes = assignLanes(content);
  const secondaryLanes = assignLanes(secondary);
  const gateLanes = assignLanes(gates);

  const maxContentLane = content.length > 0 ? Math.max(...contentLanes.values()) + 1 : 0;
  const maxSecondaryLane = secondary.length > 0 ? Math.max(...secondaryLanes.values()) + 1 : 0;
  const maxGateLane = gates.length > 0 ? Math.max(...gateLanes.values()) + 1 : 0;

  const contentBlockHeight =
    maxContentLane > 0 ? maxContentLane * LANE_H_CONTENT + (maxContentLane - 1) * LANE_GAP : 0;

  const secondaryTop =
    maxContentLane > 0 && maxSecondaryLane > 0
      ? ROW_PAD_TOP + contentBlockHeight + 6
      : ROW_PAD_TOP + contentBlockHeight;

  const secondaryBlockHeight =
    maxSecondaryLane > 0
      ? maxSecondaryLane * LANE_H_SECONDARY + (maxSecondaryLane - 1) * LANE_GAP
      : 0;

  const gateTop =
    maxGateLane > 0
      ? Math.max(ROW_PAD_TOP, secondaryTop + secondaryBlockHeight + 4)
      : ROW_PAD_TOP;

  const laidOut: GanttBarLayout[] = [];

  for (const bar of content) {
    const lane = contentLanes.get(bar.id) ?? 0;
    laidOut.push({
      ...bar,
      lane,
      track: "content",
      topPx: ROW_PAD_TOP + lane * (LANE_H_CONTENT + LANE_GAP),
      heightPx: LANE_H_CONTENT,
    });
  }

  for (const bar of secondary) {
    const lane = secondaryLanes.get(bar.id) ?? 0;
    laidOut.push({
      ...bar,
      lane,
      track: "secondary",
      topPx: secondaryTop + lane * (LANE_H_SECONDARY + LANE_GAP),
      heightPx: LANE_H_SECONDARY,
    });
  }

  for (const bar of gates) {
    const lane = gateLanes.get(bar.id) ?? 0;
    laidOut.push({
      ...bar,
      lane,
      track: "gate",
      topPx: gateTop + lane * 18,
      heightPx: 14,
    });
  }

  const contentBottom = maxContentLane > 0 ? ROW_PAD_TOP + contentBlockHeight : ROW_PAD_TOP;
  const secondaryBottom =
    maxSecondaryLane > 0 ? secondaryTop + secondaryBlockHeight : contentBottom;
  const gateBottom = maxGateLane > 0 ? gateTop + maxGateLane * 18 : secondaryBottom;

  const rowHeightPx = Math.max(MIN_ROW_HEIGHT, gateBottom + ROW_PAD_BOTTOM);

  return { bars: laidOut, rowHeightPx };
}

function stepPct(status: string): number {
  if (status === "completed" || status === "reviewed") return 100;
  if (status === "in_progress" || status === "submitted" || status === "under_review") return 50;
  return 0;
}

export function computeHealth(progress: number, dayInRamp: number): GanttHealth {
  const expected = Math.round(dayInRamp * 1.6);
  if (dayInRamp > 7 && progress < expected * 0.35) return "critical";
  if (progress < Math.max(10, dayInRamp * 0.75)) return "behind";
  if (progress > dayInRamp * 1.15) return "ahead";
  return "on-pace";
}

export function rampColor(health: GanttHealth): string {
  if (health === "critical") return "#B83128";
  if (health === "behind") return "#D4810A";
  if (health === "ahead") return "#0071CE";
  return "#0A6E45";
}

function stepToBar(step: CalendarStep, row: CalendarPlanRow, timelineStart: string): GanttBar {
  const type = mapStepType(step);
  const endDay = Math.max(0, calendarDaysBetween(timelineStart, step.dueDate));

  if (type === "gate") {
    return {
      id: step.assignmentStepId,
      assignmentId: row.assignmentId,
      assignmentStepId: step.assignmentStepId,
      type,
      label: step.title,
      startDay: endDay,
    };
  }

  const days = barDuration(type);
  const startDay = Math.max(0, endDay - days + 1);

  return {
    id: step.assignmentStepId,
    assignmentId: row.assignmentId,
    assignmentStepId: step.assignmentStepId,
    type,
    label: step.title,
    startDay,
    days,
    pct: stepPct(step.status),
  };
}

function primaryRowForUser(rows: CalendarPlanRow[]): CalendarPlanRow | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null;
}

export function timelineStartFromRows(rows: CalendarPlanRow[]): string {
  const dates = rows.map((row) => row.startDate).sort();
  return dates[0] ?? new Date().toISOString().slice(0, 10);
}

export function todayDayIndex(timelineStart: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return Math.max(0, calendarDaysBetween(timelineStart, today));
}

export function buildGanttRows({
  calendarRows,
  plans,
  profiles,
  mentorOnlyUserId,
  singleUserId,
  mentorView,
}: {
  calendarRows: CalendarPlanRow[];
  plans: UserPlan[];
  profiles: Profile[];
  mentorOnlyUserId?: string | null;
  singleUserId?: string | null;
  mentorView?: boolean;
}): { rows: GanttSeRow[]; timelineStart: string } {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const planByAssignment = new Map(plans.map((p) => [p.id, p]));
  const timelineStart = timelineStartFromRows(calendarRows);
  const today = new Date().toISOString().slice(0, 10);

  const byUser = new Map<string, CalendarPlanRow[]>();
  for (const row of calendarRows) {
    if (singleUserId && row.userId !== singleUserId) continue;
    const plan = planByAssignment.get(row.assignmentId);
    if (mentorOnlyUserId && plan?.mentorId !== mentorOnlyUserId) continue;
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }

  const ganttRows: GanttSeRow[] = [];

  for (const [userId, userRows] of byUser) {
    const row = primaryRowForUser(userRows);
    if (!row) continue;

    const profile = profileById.get(userId);
    const plan = planByAssignment.get(row.assignmentId);
    const steps = mentorView ? filterStepsForMentor(row.steps) : row.steps;
    const bars = steps
      .filter((step) => step.dueDate)
      .map((step) => stepToBar(step, row, timelineStart))
      .sort((a, b) => a.startDay - b.startDay);

    const rampPct = Math.round(plan?.progress ?? 0);
    const dayInRamp = Math.max(1, businessDaysBetween(row.startDate, today) + 1);
    const health = computeHealth(rampPct, dayInRamp);
    const healthStyle = HEALTH_STYLES[health];
    const mentorProfile = plan?.mentorId ? profileById.get(plan.mentorId) : undefined;

    ganttRows.push({
      id: userId,
      userId,
      assignmentId: row.assignmentId,
      name: profile?.fullName ?? row.personName,
      initials: initials(profile?.fullName ?? row.personName),
      avatarBg: avatarGradientForId(userId),
      health,
      healthLabel: healthStyle.label,
      healthColor: healthStyle.color,
      healthBg: healthStyle.bg,
      rampPct,
      dayInRamp,
      mentor: mentorProfile?.fullName ?? null,
      planName: row.planName,
      bars,
    });
  }

  ganttRows.sort((a, b) => a.name.localeCompare(b.name));

  return { rows: ganttRows, timelineStart };
}

export function dueOffsetFromBarStart(
  planStartDate: string,
  timelineStart: string,
  barStartDay: number,
  barDays = 1,
): number {
  const endDate = addCalendarDays(timelineStart, barStartDay + barDays - 1);
  return Math.max(1, businessDaysBetween(planStartDate, endDate));
}

export function shiftBarToMonday(bar: GanttBar): number {
  let day = bar.startDay;
  while (day % 7 === 5 || day % 7 === 6) day += 1;
  return day;
}
