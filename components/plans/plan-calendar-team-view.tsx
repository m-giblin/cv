"use client";

import { format, startOfWeek } from "date-fns";
import Link from "next/link";
import { Tag } from "@/components/ui/tag";
import type { PlanCalendarConflict } from "@/lib/plans/plan-calendar-conflicts";
import {
  GANTT_TOTAL_DAYS,
  HEALTH_TAG,
  rampColor,
  todayDayIndex,
  type GanttSeRow,
} from "@/lib/plans/plan-calendar-gantt";
import { AVATAR_CLASSNAME } from "@/lib/se/avatar-gradients";
import { cn } from "@/lib/utils";

function Avatar({ initials: label, size = 36 }: { initials: string; size?: number }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium",
        AVATAR_CLASSNAME,
      )}
      style={{ width: size, height: size }}
    >
      {label}
    </div>
  );
}

const NEXT_MILESTONE_TONE = {
  soon: "border-danger bg-danger-soft",
  near: "border-warning bg-warning-soft",
  later: "border-success bg-success-soft",
} as const;

const NEXT_MILESTONE_TEXT = {
  soon: "text-danger",
  near: "text-warning",
  later: "text-success",
} as const;

export function PlanCalendarTeamView({
  rows,
  timelineStart,
  conflicts,
}: {
  rows: GanttSeRow[];
  timelineStart: string;
  conflicts: PlanCalendarConflict[];
}) {
  const todayDay = todayDayIndex(timelineStart);
  const weekLabel = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d, yyyy");
  const avgRamp =
    rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.rampPct, 0) / rows.length) : 0;
  const atRisk = rows.filter((row) => row.health === "critical" || row.health === "behind").length;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-ink">Team summary</h2>
          <div className="mt-0.5 text-[13px] text-muted">All ramp plans · Week of {weekLabel}</div>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: "AVG RAMP", val: `${avgRamp}%`, cls: "text-ink" },
            { label: "AT RISK", val: String(atRisk), cls: "text-danger" },
            { label: "CONFLICTS", val: String(conflicts.length), cls: "text-warning" },
          ].map((stat) => (
            <div className="rounded-[14px] border border-line bg-white px-3.5 py-1.5 text-center" key={stat.label}>
              <div className={cn("font-mono text-lg font-medium", stat.cls)}>{stat.val}</div>
              <div className="label-mono mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[14px] border-[1.5px] border-dashed border-line-strong py-12 text-center">
          <p className="text-sm font-semibold text-ink">No team plans yet</p>
          <p className="mt-1 text-[13px] text-muted">Assign ramp plans to see team summary cards.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((se) => {
            const upcoming = se.bars
              .filter((bar) => bar.startDay >= todayDay)
              .sort((a, b) => a.startDay - b.startDay)[0];
            const daysAway = upcoming ? upcoming.startDay - todayDay : 999;
            const urgency = daysAway <= 7 ? "soon" : daysAway <= 14 ? "near" : "later";
            const gatesCleared = se.bars.filter((bar) => bar.type === "gate" && bar.startDay < todayDay).length;
            const healthTag = HEALTH_TAG[se.health];

            return (
              <div
                className={cn(
                  "rounded-[14px] bg-white p-4",
                  se.health === "critical" ? "border-[1.5px] border-danger" : "border border-line",
                )}
                key={se.id}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={se.initials} />
                    <div>
                      <div className="text-[15px] font-semibold text-ink">{se.name}</div>
                      <div className="font-mono text-xs text-muted">Day {se.dayInRamp}</div>
                    </div>
                  </div>
                  <Tag tone={healthTag.tone}>
                    <span aria-hidden="true">{healthTag.symbol}</span>
                    {se.healthLabel}
                  </Tag>
                </div>

                <div className="mb-3">
                  <div className="mb-1 flex justify-between">
                    <span className="text-[13px] text-muted">Ramp progress</span>
                    <span className="font-mono text-xs font-medium" style={{ color: rampColor(se.health) }}>
                      {se.rampPct}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${se.rampPct}%`, background: rampColor(se.health) }}
                    />
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-line bg-divider">
                  {[
                    ["—", "SIM AVG"],
                    ["0/8", "CERTS"],
                    [`${gatesCleared}/5`, "GATES"],
                  ].map(([val, lbl]) => (
                    <div className="bg-bg px-2 py-1.5 text-center" key={lbl}>
                      <div className="font-mono text-sm text-ink">{val}</div>
                      <div className="label-mono mt-0.5">{lbl}</div>
                    </div>
                  ))}
                </div>

                <div
                  className={cn(
                    "mb-3 flex items-center justify-between gap-2 rounded-[10px] border px-2.5 py-1.5",
                    NEXT_MILESTONE_TONE[urgency],
                  )}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span aria-hidden="true" className={cn("text-xs", NEXT_MILESTONE_TEXT[urgency])}>
                      ◆
                    </span>
                    <span className="truncate text-[13px] text-ink-2">{upcoming?.label ?? "Plan complete"}</span>
                  </div>
                  <span className={cn("shrink-0 font-mono text-xs font-medium", NEXT_MILESTONE_TEXT[urgency])}>
                    {upcoming ? `in ${daysAway}d` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] text-muted">
                    Mentor:{" "}
                    <span className={se.mentor ? "text-ink" : "font-semibold text-danger"}>
                      {se.mentor ?? "Unassigned"}
                    </span>
                  </span>
                  <Link className="link text-[13px]" href={`/manager/programs?userId=${se.userId}`}>
                    Open plan →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 font-mono text-xs text-muted">Timeline window · {GANTT_TOTAL_DAYS} days from plan start</p>
    </div>
  );
}
