"use client";

import { useState } from "react";
import { TABLE_HEAD_CLS } from "@/components/se/form-classes";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
import { DEMO_CALENDAR_WEEKS } from "./data";
import type { CalMilestone, CalWeek } from "./types";
import { buildMonthGrid } from "./utils/calendarGrid";

type MilestoneStatus = CalMilestone["status"];

const STATUS_TAG: Record<MilestoneStatus, { tone: "blue" | "signal" | "danger" | "neutral"; label: string }> = {
  DONE: { tone: "blue", label: "✓ Done" },
  "DUE TODAY": { tone: "signal", label: "● Due today" },
  OPEN: { tone: "danger", label: "▲ Past due" },
  UPCOMING: { tone: "neutral", label: "○ Upcoming" },
};

/** Event chip styles in the month grid: done blue, today signal, past due danger, upcoming dashed. */
const EVENT_CLS: Record<MilestoneStatus, string> = {
  DONE: "bg-blue text-white border-[1.5px] border-blue",
  "DUE TODAY": "bg-signal text-ink border-[1.5px] border-ink",
  OPEN: "bg-danger-soft text-danger border-[1.5px] border-danger",
  UPCOMING: "bg-white text-ink border-[1.5px] border-dashed border-dash",
};

const EVENT_SYMBOL: Record<MilestoneStatus, string> = {
  DONE: "✓",
  "DUE TODAY": "●",
  OPEN: "▲",
  UPCOMING: "○",
};

const GRID_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isGate(type: string) {
  return type.trim().toLowerCase() === "gate";
}

type WeekState = "done" | "current" | "upcoming";

function weekStates(weeks: CalWeek[]): WeekState[] {
  const currentIndex = weeks.findIndex((week) => !week.done);
  return weeks.map((week, index) => {
    if (week.done) return "done";
    return index === currentIndex ? "current" : "upcoming";
  });
}

function ListView({ weeks }: { weeks: CalWeek[] }) {
  const states = weekStates(weeks);

  if (weeks.length === 0) {
    return (
      <div className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center text-[15px] text-muted">
        No dated milestones on your plan yet.
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-3.5">
      {weeks.map((week, index) => {
        const state = states[index];
        return (
          <li
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "overflow-hidden rounded-[14px] bg-white",
              state === "done" && "border-[1.5px] border-blue",
              state === "current" && "border-[1.5px] border-ink",
              state === "upcoming" && "border-[1.5px] border-dashed border-dash",
            )}
            key={week.label}
          >
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 px-5 py-2.5",
                state === "done" && "bg-blue text-white",
                state === "current" && "border-b-[1.5px] border-ink bg-signal text-ink",
                state === "upcoming" && "border-b border-divider text-ink-2",
              )}
            >
              <h2 className="font-mono text-xs font-medium uppercase tracking-[0.03em]">{week.label}</h2>
              {state === "done" ? (
                <span className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-signal">✓ Complete</span>
              ) : state === "current" ? (
                <span className="font-mono text-xs font-bold uppercase tracking-[0.03em]">▲ You are here</span>
              ) : (
                <span className="font-mono text-xs uppercase tracking-[0.03em] text-muted">○ Upcoming</span>
              )}
            </div>
            <ul className="divide-y divide-divider">
              {week.milestones.map((ms) => {
                const gate = isGate(ms.type);
                const tag = STATUS_TAG[ms.status] ?? STATUS_TAG.UPCOMING;
                return (
                  <li
                    className={cn(
                      "grid grid-cols-1 items-center gap-2 px-5 py-3 md:grid-cols-[120px_minmax(0,1fr)_auto] md:gap-4",
                      gate && "bg-blue-soft",
                    )}
                    key={`${ms.day}-${ms.title}`}
                  >
                    <div className="font-mono text-xs uppercase text-ink-2">{ms.day}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-ink">{ms.title}</span>
                        {gate ? <Tag tone="blue">◆ Gate</Tag> : null}
                      </div>
                      {!gate ? (
                        <div className="mt-0.5 font-mono text-xs uppercase tracking-[0.03em] text-muted">{ms.type}</div>
                      ) : null}
                      {ms.managerNote ? (
                        <p className="mt-1 text-[13px] text-ink-2">
                          <span className="font-semibold">Manager note:</span> {ms.managerNote}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex md:justify-end">
                      <Tag tone={tag.tone}>{tag.label}</Tag>
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

function GridView({ weeks, year, month }: { weeks: CalWeek[]; year: number; month: number }) {
  const allMilestones = weeks.flatMap((w) => w.milestones).filter((ms): ms is CalMilestone & { date: string } => Boolean(ms.date));
  const days = buildMonthGrid(year, month, allMilestones);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
        <div className="min-w-[760px]">
          <div className={cn("grid grid-cols-7", TABLE_HEAD_CLS)}>
            {GRID_HEADERS.map((h) => (
              <div className="px-2 py-2 text-center" key={h}>
                {h}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((cell, i) => (
              <div
                aria-current={cell.isToday ? "date" : undefined}
                className={cn(
                  "min-h-24 border-b border-r border-divider p-1.5 [&:nth-child(7n)]:border-r-0",
                  cell.day === 0 && "bg-surface-2",
                  cell.isToday && "bg-signal-soft",
                )}
                key={`cell-${i}`}
              >
                {cell.day > 0 ? (
                  cell.isToday ? (
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full border-[1.5px] border-ink bg-signal px-1 font-mono text-xs font-bold text-ink">
                        {cell.day}
                      </span>
                      <span className="font-mono text-xs font-bold uppercase text-ink">▲ Today</span>
                    </div>
                  ) : (
                    <div className="mb-1 font-mono text-xs text-ink-2">{cell.day}</div>
                  )
                ) : null}
                <ul className="flex flex-col gap-1">
                  {cell.events.map((ev) => {
                    const gate = isGate(ev.type);
                    const status = ev.status ?? (ev.done ? "DONE" : "UPCOMING");
                    return (
                      <li
                        className={cn("rounded-[6px] px-1.5 py-1", EVENT_CLS[status])}
                        key={`${ev.title}-${ev.type}`}
                        title={`${ev.title} · ${STATUS_TAG[status].label}`}
                      >
                        <div className="truncate text-xs font-semibold leading-snug">
                          <span aria-hidden="true">{gate ? "◆" : EVENT_SYMBOL[status]} </span>
                          {ev.title}
                        </div>
                        <div className="truncate font-mono text-xs uppercase opacity-90">
                          {gate ? "Gate" : ev.type}
                          <span className="sr-only"> · {STATUS_TAG[status].label}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ul aria-label="Legend" className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-2">
        {(["DONE", "DUE TODAY", "OPEN", "UPCOMING"] as const).map((status) => (
          <li className="flex items-center gap-2" key={status}>
            <span aria-hidden="true" className={cn("h-3 w-4 rounded-[3px]", EVENT_CLS[status])} />
            {STATUS_TAG[status].label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="font-mono text-xs text-blue">
            ◆
          </span>
          Gate
        </li>
      </ul>
    </div>
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedToggle
          label="Calendar layout"
          onChange={(id) => setView(id === "grid" ? "grid" : "list")}
          options={[
            { id: "list", label: "Weeks" },
            { id: "grid", label: "Month" },
          ]}
          value={view}
        />
        <span className="font-mono text-xs uppercase tracking-[0.03em] text-ink-2">{monthLabel}</span>
      </div>

      <p className="text-[13px] text-muted">
        <span className="font-mono text-xs uppercase tracking-[0.03em] text-ink-2">Read-only · </span>
        Your manager sets milestone dates. To request a change, message them via coaching notes.
      </p>

      {view === "list" ? <ListView weeks={weeks} /> : <GridView month={month} weeks={weeks} year={year} />}
    </div>
  );
}
