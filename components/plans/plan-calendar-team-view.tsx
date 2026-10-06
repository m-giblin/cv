"use client";

import { startOfWeek } from "date-fns";
import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { PersonCell } from "@/components/ui/table";
import type { PlanCalendarConflict } from "@/lib/plans/plan-calendar-conflicts";
import {
  GANTT_TOTAL_DAYS,
  HEALTH_TAG,
  todayDayIndex,
  type GanttHealth,
  type GanttSeRow,
} from "@/lib/plans/plan-calendar-gantt";
import { cn } from "@/lib/utils";

/** Ramp fill on v3 status tokens (blue when on pace or ahead). */
export const RAMP_FILL_CLS: Record<GanttHealth, string> = {
  critical: "bg-danger",
  behind: "bg-warning-dot",
  "on-pace": "bg-blue",
  ahead: "bg-blue",
};

/** Sentence-case health words (the data layer still carries v2 caps labels). */
export const HEALTH_WORD: Record<GanttHealth, string> = {
  critical: "Critical",
  behind: "Behind",
  "on-pace": "On pace",
  ahead: "Ahead",
};

const NEXT_MILESTONE = {
  soon: { tone: "danger" },
  near: { tone: "warning" },
  later: { tone: "success" },
} as const;

function shortDate(date: Date) {
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  if (date.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return date.toLocaleDateString("en-US", opts);
}

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
  const weekLabel = shortDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const avgRamp =
    rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.rampPct, 0) / rows.length) : 0;
  const atRisk = rows.filter((row) => row.health === "critical" || row.health === "behind").length;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink">Team summary</h2>
          <p className="mt-1 text-sm text-muted">Every ramp plan for the week of {weekLabel}.</p>
        </div>
        <dl className="flex flex-wrap items-end gap-x-10 gap-y-3">
          {[
            { label: "Avg ramp", val: `${avgRamp}%`, cls: "text-blue" },
            { label: "At risk", val: String(atRisk), cls: atRisk > 0 ? "text-danger" : "text-blue" },
            { label: "Conflicts", val: String(conflicts.length), cls: conflicts.length > 0 ? "text-warning" : "text-blue" },
          ].map((stat) => (
            <div className="flex flex-col gap-1" key={stat.label}>
              <dt className="label-caps whitespace-nowrap">{stat.label}</dt>
              <dd className={cn("num text-[28px] leading-none font-extrabold tracking-[-0.03em]", stat.cls)}>
                {stat.val}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line-strong py-12 text-center">
          <p className="text-[15px] font-bold text-ink">No team plans yet</p>
          <p className="mt-1 text-sm text-muted">Assign ramp plans to see a summary card for each person.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((se) => {
            const upcoming = se.bars
              .filter((bar) => bar.startDay >= todayDay)
              .sort((a, b) => a.startDay - b.startDay)[0];
            const daysAway = upcoming ? upcoming.startDay - todayDay : 999;
            const urgency = daysAway <= 7 ? "soon" : daysAway <= 14 ? "near" : "later";
            const gatesCleared = se.bars.filter((bar) => bar.type === "gate" && bar.startDay < todayDay).length;
            const healthTag = HEALTH_TAG[se.health];
            const next = NEXT_MILESTONE[urgency];

            return (
              <div
                className={cn(
                  "flex flex-col gap-4 rounded-[14px] border border-line bg-white p-5",
                  se.health === "critical" && "shadow-[inset_3px_0_0_var(--color-danger)]",
                )}
                key={se.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <PersonCell initials={se.initials} name={se.name} subline={`Day ${se.dayInRamp} of the ramp`} />
                  <StatusPill tone={healthTag.tone}>{HEALTH_WORD[se.health]}</StatusPill>
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="text-muted">Ramp progress</span>
                    <span className="num font-semibold text-ink">{se.rampPct}%</span>
                  </div>
                  <div
                    aria-label={`Ramp progress ${se.rampPct}%`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={se.rampPct}
                    className="h-2 overflow-hidden rounded-[4px] bg-track"
                    role="progressbar"
                  >
                    <div className={cn("h-full rounded-[4px]", RAMP_FILL_CLS[se.health])} style={{ width: `${se.rampPct}%` }} />
                  </div>
                </div>

                <dl className="grid grid-cols-3 overflow-hidden rounded-[10px] border border-line">
                  {[
                    ["Sim average", "—"],
                    ["Certs", "0 of 8"],
                    ["Gates", `${gatesCleared} of 5`],
                  ].map(([lbl, val]) => (
                    <div className="flex flex-col gap-0.5 border-divider px-3 py-2 [&+&]:border-l" key={lbl}>
                      <dt className="text-[13px] text-muted">{lbl}</dt>
                      <dd className="num text-[15px] font-bold text-ink">{val}</dd>
                    </div>
                  ))}
                </dl>

                <div className="flex items-center justify-between gap-3 border-t border-divider pt-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[13px] text-muted">Next up</span>
                    <span className="truncate text-sm font-semibold text-ink">{upcoming?.label ?? "Plan complete"}</span>
                  </div>
                  {upcoming ? (
                    <StatusPill tone={next.tone}>
                      {daysAway === 0 ? "Today" : `In ${daysAway} ${daysAway === 1 ? "day" : "days"}`}
                    </StatusPill>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-muted">
                    Mentor{" "}
                    <span className={se.mentor ? "font-semibold text-ink" : "font-semibold text-danger"}>
                      {se.mentor ?? "not assigned"}
                    </span>
                  </span>
                  <Link className="link text-sm" href={`/manager/programs?userId=${se.userId}`}>
                    Open plan
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-[13px] text-muted">The timeline covers {GANTT_TOTAL_DAYS} days from each plan start.</p>
    </div>
  );
}
