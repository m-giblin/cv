"use client";

import { useState } from "react";
import { DEMO_CALENDAR_WEEKS } from "./data";
import type { CalMilestone, CalWeek } from "./types";
import { buildMonthGrid } from "./utils/calendarGrid";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DONE: { bg: "rgba(10,110,69,.08)", color: "#0A6E45" },
  "DUE TODAY": { bg: "rgba(184,49,40,.08)", color: "#B83128" },
  OPEN: { bg: "rgba(0,113,206,.08)", color: "#0071CE" },
  UPCOMING: { bg: "#F5F4F0", color: "#A09D98" },
};

const GRID_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ListView({ weeks }: { weeks: CalWeek[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      {weeks.map((week) => (
        <div className="border border-[#E2DFD9] bg-white" key={week.label}>
          <div className="flex items-center justify-between border-b border-[#E2DFD9] bg-[#F5F4F0] p-[10px_16px]">
            <span className="font-mono text-[9px] font-medium tracking-wide text-[#3D3C38]">{week.label}</span>
            {week.done ? (
              <span className="font-mono text-[7.5px] tracking-widest text-[#0A6E45] bg-[rgba(10,110,69,.08)] px-[7px] py-0.5">
                COMPLETE
              </span>
            ) : null}
          </div>
          {week.milestones.map((ms) => {
            const ss = STATUS_STYLE[ms.status] ?? STATUS_STYLE.UPCOMING;
            return (
              <div
                className="grid grid-cols-[90px_24px_1fr_100px] items-center gap-3 border-b border-[#F5F4F0] p-[10px_16px] max-md:grid-cols-1"
                key={`${ms.day}-${ms.title}`}
              >
                <div className="font-mono text-[8.5px] text-[#A09D98]">{ms.day}</div>
                <div className="text-center text-base max-md:hidden">{ms.icon}</div>
                <div>
                  <div className="text-[11.5px] font-semibold text-[#0D0E12]">{ms.title}</div>
                  <div className="mt-px font-mono text-[8px] text-[#A09D98]">{ms.type}</div>
                  {ms.managerNote ? (
                    <div className="mt-1 text-[10px] italic text-[#0071CE]">💬 {ms.managerNote}</div>
                  ) : null}
                </div>
                <div className="flex justify-end max-md:justify-start">
                  <span
                    className="whitespace-nowrap font-mono text-[7.5px] px-2 py-0.5"
                    style={{ background: ss.bg, color: ss.color }}
                  >
                    {ms.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function GridView({ weeks, year, month }: { weeks: CalWeek[]; year: number; month: number }) {
  const allMilestones = weeks.flatMap((w) => w.milestones).filter((ms): ms is CalMilestone & { date: string } => Boolean(ms.date));
  const days = buildMonthGrid(year, month, allMilestones);

  return (
    <>
      <div className="border border-[#E2DFD9] bg-white">
        <div className="grid grid-cols-7 border-b border-[#E2DFD9]">
          {GRID_HEADERS.map((h) => (
            <div
              className="border-r border-[#F5F4F0] p-1 text-center font-mono text-[8px] tracking-wide text-[#A09D98] last:border-r-0"
              key={h}
            >
              {h}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((cell, i) => (
            <div
              className="min-h-20 border-b border-r border-[#F5F4F0] p-[5px_6px] last:border-r-0"
              key={`cell-${i}`}
              style={{ background: cell.cellBg }}
            >
              {cell.day > 0 ? (
                cell.isToday ? (
                  <div className="mb-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#0071CE] font-mono text-[9px] font-bold text-white">
                    {cell.day}
                  </div>
                ) : (
                  <div className="mb-1 font-mono text-[9px] text-[#3D3C38]">{cell.day}</div>
                )
              ) : null}
              {cell.events.map((ev) => (
                <div
                  className="mb-0.5 px-1 py-0.5"
                  key={`${ev.title}-${ev.type}`}
                  style={{ background: ev.evBg, borderLeft: `2px solid ${ev.color}` }}
                >
                  <div className="truncate text-[9px] font-medium leading-snug text-[#0D0E12]">
                    {ev.icon} {ev.title}
                  </div>
                  <div className="font-mono text-[7px] tracking-wide text-[#A09D98]">{ev.type}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-3.5 px-0 py-2">
        {[
          { label: "Completed", bg: "rgba(10,110,69,.15)", border: "#0A6E45" },
          { label: "Upcoming", bg: "rgba(0,113,206,.06)", border: "#0071CE" },
          { label: "Today", bg: "#F0F7FF", border: "#0071CE" },
          { label: "Due today", bg: "rgba(184,49,40,.08)", border: "#B83128" },
        ].map((l) => (
          <div className="flex items-center gap-1.5 text-[9.5px] text-[#6B6860]" key={l.label}>
            <div className="h-2.5 w-2.5 shrink-0" style={{ background: l.bg, borderLeft: `2px solid ${l.border}` }} />
            {l.label}
          </div>
        ))}
      </div>
    </>
  );
}

export function PlanCalendarPage({
  weeks = DEMO_CALENDAR_WEEKS,
  year = 2026,
  month = 7,
  monthLabel = "July 2026",
}: {
  weeks?: CalWeek[];
  year?: number;
  month?: number;
  monthLabel?: string;
}) {
  const [view, setView] = useState<"list" | "grid">("list");

  return (
    <div className="px-[22px] pb-[34px] pt-[22px]">
      <div className="mb-[18px] border-l-[3px] border-[#0071CE] pl-3.5">
        <div className="mb-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#A09D98]">Workspace · Read-only</div>
        <h1 className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[#0D0E12]">
          Plan Calendar
        </h1>
        <p className="mt-1 text-xs text-[#6B6860]">Your milestone schedule — dates are set by your manager</p>
      </div>

      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex gap-px border border-[#E2DFD9] bg-[#E2DFD9]">
          {(["list", "grid"] as const).map((v) => (
            <button
              className="cursor-pointer border-none px-3.5 py-[5px] font-sans text-[9.5px] font-semibold"
              key={v}
              onClick={() => setView(v)}
              style={{
                background: view === v ? "#fff" : "#F5F4F0",
                color: view === v ? "#0071CE" : "#6B6860",
                fontWeight: view === v ? 600 : 500,
              }}
              type="button"
            >
              {v === "list" ? "≡ List" : "⊞ Calendar"}
            </button>
          ))}
        </div>
        <span className="font-mono text-[9px] text-[#A09D98]">{monthLabel}</span>
      </div>

      <div className="mb-5 flex items-center gap-2.5 border border-[rgba(0,113,206,.15)] bg-[rgba(0,113,206,.04)] p-[10px_14px]">
        <svg fill="none" height="14" stroke="#0071CE" strokeLinecap="round" strokeWidth="1.5" viewBox="0 0 16 16" width="14">
          <circle cx="8" cy="8" r="6" />
          <line x1="8" x2="8" y1="7" y2="11" />
          <circle cx="8" cy="5" fill="#0071CE" r=".5" stroke="none" />
        </svg>
        <span className="text-[11px] text-[#0071CE]">
          Your manager controls milestone dates. To request a change, message them via coaching notes.
        </span>
      </div>

      {view === "list" ? <ListView weeks={weeks} /> : <GridView month={month} weeks={weeks} year={year} />}
    </div>
  );
}
