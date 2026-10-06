"use client";

import { useState } from "react";
import { TABLE_HEAD_CLS } from "@/components/se/form-classes";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { StatusPill } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
import { DEMO_CALENDAR_WEEKS } from "./data";
import type { CalMilestone, CalWeek } from "./types";
import { buildMonthGrid } from "./utils/calendarGrid";

type MilestoneStatus = CalMilestone["status"];

const STATUS_TAG: Record<MilestoneStatus, { tone: "success" | "warning" | "danger" | "neutral"; label: string }> = {
  DONE: { tone: "success", label: "Done" },
  "DUE TODAY": { tone: "warning", label: "Due today" },
  OPEN: { tone: "danger", label: "Past due" },
  UPCOMING: { tone: "neutral", label: "Upcoming" },
};

/** Event chip styles in the month grid: done blue-soft, today signal-soft, past due danger-row, upcoming dashed. */
const EVENT_CLS: Record<MilestoneStatus, string> = {
  DONE: "bg-blue-soft text-ink shadow-[inset_3px_0_0_var(--color-blue)]",
  "DUE TODAY": "bg-signal-soft text-ink shadow-[inset_3px_0_0_var(--color-signal)]",
  OPEN: "bg-danger-row text-ink shadow-[inset_3px_0_0_var(--color-danger)]",
  UPCOMING: "bg-white text-ink border border-dashed border-line-strong",
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
      <div className="rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted">
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
              state === "done" && "border border-line",
              state === "current" && "border border-line shadow-[inset_3px_0_0_var(--color-signal)]",
              state === "upcoming" && "border border-dashed border-line-strong",
            )}
            key={week.label}
          >
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 px-5 py-2.5",
                "border-b border-divider",
                state === "current" && "bg-signal-soft",
              )}
            >
              <h2 className="text-[15px] font-bold text-ink">{week.label}</h2>
              {state === "done" ? (
                <StatusPill tone="success">Complete</StatusPill>
              ) : state === "current" ? (
                <StatusPill tone="warning">You are here</StatusPill>
              ) : (
                <StatusPill tone="neutral">Upcoming</StatusPill>
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
                      gate && "bg-blue-soft shadow-[inset_3px_0_0_var(--color-blue)]",
                    )}
                    key={`${ms.day}-${ms.title}`}
                  >
                    <div className="text-sm text-ink-2">{ms.day}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-ink">{ms.title}</span>
                        {gate ? <Tag tone="blue">Gate</Tag> : null}
                      </div>
                      {!gate ? (
                        <div className="mt-0.5 text-[13px] text-muted">{ms.type}</div>
                      ) : null}
                      {ms.managerNote ? (
                        <p className="mt-1 text-[13px] text-ink-2">
                          <span className="font-semibold">Manager note:</span> {ms.managerNote}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex md:justify-end">
                      <StatusPill tone={tag.tone}>{tag.label}</StatusPill>
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
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1 text-xs font-bold text-white">
                        {cell.day}
                      </span>
                      <span className="text-xs font-bold text-ink">Today</span>
                    </div>
                  ) : (
                    <div className="mb-1 text-xs text-ink-2">{cell.day}</div>
                  )
                ) : null}
                <ul className="flex flex-col gap-1">
                  {cell.events.map((ev) => {
                    const gate = isGate(ev.type);
                    const status = ev.status ?? (ev.done ? "DONE" : "UPCOMING");
                    return (
                      <li
                        className={cn("rounded-[6px] py-1 pr-1.5 pl-2", gate ? "bg-blue text-white" : EVENT_CLS[status])}
                        key={`${ev.title}-${ev.type}`}
                        title={`${ev.title}: ${STATUS_TAG[status].label}`}
                      >
                        <div className="truncate text-xs font-semibold leading-snug">{ev.title}</div>
                        <div className="truncate text-xs">
                          {gate ? "Gate" : ev.type}, {STATUS_TAG[status].label.toLowerCase()}
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
          <span aria-hidden="true" className="h-3 w-4 rounded-[3px] bg-blue" />
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
        <span className="text-sm font-semibold text-ink-2">{monthLabel}</span>
      </div>

      <p className="text-[13px] text-muted">
        Read only. Your manager sets milestone dates; to change one, message them in coaching notes.
      </p>

      {view === "list" ? <ListView weeks={weeks} /> : <GridView month={month} weeks={weeks} year={year} />}
    </div>
  );
}
