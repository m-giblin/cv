import { TEMPLATE_SORT_ORDER } from "@/lib/plans/template-catalog";
import type { UserPlan } from "@/lib/types";

export const RAMP_WEEKS_TOTAL = 8;

/** Ordered SailPoint + standard ramp templates for manager program tracker. */
export const PROGRAM_STAGE_NAMES = Object.entries(TEMPLATE_SORT_ORDER)
  .sort(([, a], [, b]) => a - b)
  .map(([name]) => name)
  .filter((name) => name.startsWith("Week"));

export function daysSinceIsoDate(isoDate: string, now = new Date()): number {
  const start = new Date(`${isoDate}T12:00:00`);
  const today = new Date(`${now.toISOString().slice(0, 10)}T12:00:00`);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
}

export function currentRampWeek(startDate: string, now = new Date()): number {
  const days = daysSinceIsoDate(startDate, now);
  return Math.min(RAMP_WEEKS_TOTAL, Math.max(1, Math.floor(days / 7) + 1));
}

export function parsePlanWeekRange(planName: string): { start: number; end: number } | null {
  const range = planName.match(/Week\s+(\d+)\s*[–-]\s*(\d+)/i);
  if (range) {
    return { start: Number(range[1]), end: Number(range[2]) };
  }

  const single = planName.match(/Week\s+(\d+)/i);
  if (single) {
    const week = Number(single[1]);
    return { start: week, end: week };
  }

  return null;
}

export type WeekRunwayCell = {
  week: number;
  status: "done" | "current" | "upcoming";
};

export function buildWeekRunway(plan: UserPlan | undefined, now = new Date()): WeekRunwayCell[] {
  const currentWeek = plan?.startDate ? currentRampWeek(plan.startDate, now) : 1;

  return Array.from({ length: RAMP_WEEKS_TOTAL }, (_, index) => {
    const week = index + 1;
    let status: WeekRunwayCell["status"] = "upcoming";

    if (week < currentWeek) {
      status = "done";
    } else if (week === currentWeek) {
      status = "current";
    }

    return { week, status };
  });
}

export function rampWeekLabel(plan: UserPlan | undefined, now = new Date()): string {
  if (!plan) return "No active ramp";

  const range = parsePlanWeekRange(plan.name);
  const current = plan.startDate ? currentRampWeek(plan.startDate, now) : range?.start ?? 1;

  if (range) {
    return `Week ${current} of ${RAMP_WEEKS_TOTAL} · ${plan.name}`;
  }

  return `Week ${current} of ${RAMP_WEEKS_TOTAL} · ${plan.name}`;
}

export function planIsComplete(plan: UserPlan): boolean {
  if (plan.progress >= 100) return true;
  if (plan.status === "completed" || plan.status === "reviewed") return true;
  if (plan.steps.length === 0) return false;
  return plan.steps.every((step) => step.status === "reviewed");
}

export type ProgramTrackerRow = {
  stageName: string;
  shortLabel: string;
  teamSize: number;
  assigned: number;
  complete: number;
};

function stageShortLabel(name: string): string {
  const range = parsePlanWeekRange(name);
  if (range) return `W${range.start}–${range.end}`;
  return name.length > 12 ? `${name.slice(0, 12)}…` : name;
}

export function buildProgramTrackerRows(teamIds: string[], plans: UserPlan[]): ProgramTrackerRow[] {
  const teamSet = new Set(teamIds);
  const teamPlans = plans.filter((plan) => teamSet.has(plan.userId));

  const activeNames = new Set(teamPlans.map((plan) => plan.name));
  const stages = PROGRAM_STAGE_NAMES.filter((name) => activeNames.has(name));

  if (stages.length === 0) {
    const fallbackNames = [...new Set(teamPlans.map((plan) => plan.name))].sort();
    return fallbackNames.slice(0, 5).map((stageName) => {
      const onStage = teamPlans.filter((plan) => plan.name === stageName);
      return {
        stageName,
        shortLabel: stageShortLabel(stageName),
        teamSize: teamIds.length,
        assigned: onStage.length,
        complete: onStage.filter(planIsComplete).length,
      };
    });
  }

  return stages.map((stageName) => {
    const onStage = teamPlans.filter((plan) => plan.name === stageName);
    return {
      stageName,
      shortLabel: stageShortLabel(stageName),
      teamSize: teamIds.length,
      assigned: onStage.length,
      complete: onStage.filter(planIsComplete).length,
    };
  });
}
