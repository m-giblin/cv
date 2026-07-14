"use client";

import { format, startOfWeek } from "date-fns";
import Link from "next/link";
import type { PlanCalendarConflict } from "@/lib/plans/plan-calendar-conflicts";
import { GANTT_TOTAL_DAYS, rampColor, todayDayIndex, type GanttSeRow } from "@/lib/plans/plan-calendar-gantt";

function Avatar({
  initials: label,
  bg,
  size = 36,
  fontSize = 12,
}: {
  initials: string;
  bg: string;
  size?: number;
  fontSize?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-mono font-medium text-white"
      style={{ width: size, height: size, background: bg, fontSize }}
    >
      {label}
    </div>
  );
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
  const weekLabel = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d, yyyy");
  const avgRamp =
    rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.rampPct, 0) / rows.length) : 0;
  const atRisk = rows.filter((row) => row.health === "critical" || row.health === "behind").length;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <div className="font-display text-lg font-bold text-[#0D0E12]">Team Summary</div>
          <div className="mt-0.5 text-[11px] text-[#7A7772]">All ramp plans · Week of {weekLabel}</div>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: "AVG RAMP", val: `${avgRamp}%`, color: "#0D0E12" },
            { label: "AT RISK", val: String(atRisk), color: "#B83128" },
            { label: "CONFLICTS", val: String(conflicts.length), color: "#D4810A" },
          ].map((stat) => (
            <div
              className="border border-[#E2DFD9] bg-[#F9F8F6] px-3.5 py-1.5 text-center"
              key={stat.label}
            >
              <div className="font-mono text-lg" style={{ color: stat.color }}>
                {stat.val}
              </div>
              <div className="mt-0.5 font-mono text-[7.5px] text-[#A09D98]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-semibold text-[#0D0E12]">No team plans yet</p>
          <p className="mt-1 text-[12px] text-[#6B6860]">Assign ramp plans to see team summary cards.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((se) => {
            const upcoming = se.bars
              .filter((bar) => bar.startDay >= todayDay)
              .sort((a, b) => a.startDay - b.startDay)[0];
            const daysAway = upcoming ? upcoming.startDay - todayDay : 999;
            const nmColor = daysAway <= 7 ? "#B83128" : daysAway <= 14 ? "#D4810A" : "#0A6E45";
            const gatesCleared = se.bars.filter((bar) => bar.type === "gate" && bar.startDay < todayDay).length;

            return (
              <div
                className="border bg-white p-4"
                key={se.id}
                style={{
                  borderColor: se.health === "critical" ? "rgba(184,49,40,.3)" : "#E2DFD9",
                }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar bg={se.avatarBg} initials={se.initials} />
                    <div>
                      <div className="text-[13px] font-semibold text-[#0D0E12]">{se.name}</div>
                      <div className="font-mono text-[8.5px] text-[#A09D98]">Day {se.dayInRamp}</div>
                    </div>
                  </div>
                  <span
                    className="font-mono text-[7.5px] tracking-wide"
                    style={{ color: se.healthColor, background: se.healthBg, padding: "2px 6px" }}
                  >
                    {se.healthLabel}
                  </span>
                </div>

                <div className="mb-2.5">
                  <div className="mb-1 flex justify-between">
                    <span className="text-[10.5px] text-[#6B6860]">Ramp progress</span>
                    <span
                      className="font-mono text-[11px] font-medium"
                      style={{ color: rampColor(se.health) }}
                    >
                      {se.rampPct}%
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-[#ECEAE6]">
                    <div
                      className="h-full"
                      style={{ width: `${se.rampPct}%`, background: rampColor(se.health) }}
                    />
                  </div>
                </div>

                <div className="mb-2.5 grid grid-cols-3 gap-px border border-[#E2DFD9] bg-[#E2DFD9]">
                  {[
                    ["—", "SIM AVG"],
                    ["0/8", "CERTS"],
                    [`${gatesCleared}/5`, "GATES"],
                  ].map(([val, lbl]) => (
                    <div className="bg-[#F9F8F6] px-2 py-1.5 text-center" key={lbl}>
                      <div className="font-mono text-sm text-[#0D0E12]">{val}</div>
                      <div className="mt-0.5 font-mono text-[7px] text-[#A09D98]">{lbl}</div>
                    </div>
                  ))}
                </div>

                <div
                  className="mb-2 flex items-center justify-between px-2.5 py-1.5"
                  style={{
                    background: daysAway <= 7 ? "#FFF5F5" : daysAway <= 14 ? "#FFFBF0" : "#F0FDF7",
                    border: `1px solid ${nmColor}22`,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: nmColor }} />
                    <span className="text-[10.5px] text-[#3D3C38]">{upcoming?.label ?? "Plan complete"}</span>
                  </div>
                  <span className="font-mono text-[9px]" style={{ color: nmColor }}>
                    {upcoming ? `in ${daysAway}d` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#A09D98]">
                    Mentor:{" "}
                    <span style={{ color: se.mentor ? "#0D0E12" : "#B83128" }}>
                      {se.mentor ?? "Unassigned"}
                    </span>
                  </span>
                  <Link
                    className="inline-flex items-center border border-[#D4D1CB] px-2 py-1 text-[9.5px] font-semibold text-[#3D3C38] hover:border-[#0071CE] hover:text-[#0071CE]"
                    href={`/manager?section=program&userId=${se.userId}`}
                  >
                    Open plan →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 font-mono text-[8px] text-[#A09D98]">
        Timeline window · {GANTT_TOTAL_DAYS} days from plan start
      </p>
    </div>
  );
}
