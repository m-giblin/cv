import type { GanttBar, GanttSeRow } from "@/lib/plans/plan-calendar-gantt";

export type PlanCalendarConflict = {
  id: string;
  severity: "critical" | "warning" | "info";
  seId: string;
  barId?: string;
  seName: string;
  title: string;
  msg: string;
  ctaLabel: string;
};

const isWeekendDay = (day: number) => day % 7 === 5 || day % 7 === 6;

export function detectPlanCalendarConflicts(rows: GanttSeRow[]): PlanCalendarConflict[] {
  const conflicts: PlanCalendarConflict[] = [];

  for (const se of rows) {
    for (const bar of se.bars) {
      if (bar.type === "gate" && isWeekendDay(bar.startDay)) {
        conflicts.push({
          id: `wknd-${bar.id}`,
          severity: "warning",
          seId: se.id,
          barId: bar.id,
          seName: se.name,
          title: `${bar.label} falls on weekend`,
          msg: `${se.name}'s ${bar.label} is on a weekend. Shift to nearest weekday.`,
          ctaLabel: "Shift to Mon",
        });
      }
    }

    const weekMap: Record<number, GanttBar[]> = {};
    for (const bar of se.bars) {
      if (bar.type === "content" || bar.type === "gate") continue;
      const week = Math.floor(bar.startDay / 7);
      weekMap[week] = [...(weekMap[week] ?? []), bar];
    }
    for (const [week, bars] of Object.entries(weekMap)) {
      if (bars.length >= 2) {
        conflicts.push({
          id: `overload-${se.id}-${week}`,
          severity: "warning",
          seId: se.id,
          seName: se.name,
          title: `Week ${Number(week) + 1} overloaded`,
          msg: `${bars.length} deliverables in the same week. Consider spacing out.`,
          ctaLabel: "Rebalance",
        });
      }
    }

    if (!se.mentor) {
      conflicts.push({
        id: `no-mentor-${se.id}`,
        severity: "info",
        seId: se.id,
        seName: se.name,
        title: "No mentor assigned",
        msg: `${se.name} has no mentor. 1:1 sessions unscheduled.`,
        ctaLabel: "Assign mentor",
      });
    }

    if (se.health === "critical") {
      const expected = Math.round(se.dayInRamp * 1.6);
      conflicts.push({
        id: `pace-${se.id}`,
        severity: "critical",
        seId: se.id,
        seName: se.name,
        title: `${se.name} critically behind`,
        msg: `${se.rampPct}% at day ${se.dayInRamp}. Expected ~${expected}%. Gate at risk.`,
        ctaLabel: "Review plan",
      });
    }
  }

  return conflicts;
}
