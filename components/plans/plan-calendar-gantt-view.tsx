"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useRef } from "react";
import { addCalendarDays, buildDayHeaders } from "@/lib/plans/business-days";
import {
  GANTT_DAY_PX,
  GANTT_LABEL_WIDTH,
  GANTT_TOTAL_DAYS,
  layoutGanttRow,
  rampColor,
  type GanttBarLayout,
  type GanttSeRow,
} from "@/lib/plans/plan-calendar-gantt";
import { BAR_COLORS, BAR_RGBA } from "@/lib/plans/plan-calendar-colors";

function Avatar({
  initials: label,
  bg,
  size = 30,
  fontSize = 10,
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

function RampBar({ pct, color, height = 3 }: { pct: number; color: string; height?: number }) {
  return (
    <div className="overflow-hidden rounded-full bg-[#ECEAE6]" style={{ height }}>
      <div className="transition-all duration-300" style={{ height, width: `${pct}%`, background: color }} />
    </div>
  );
}

function buildMonthHeaders(timelineStart: string, totalDays: number) {
  const headers = buildDayHeaders(timelineStart, totalDays);
  const months: { label: string; leftPx: number; widthPx: number }[] = [];
  let currentMonth = "";
  let monthStart = 0;

  headers.forEach((header, index) => {
    const monthLabel = format(new Date(`${header.iso}T12:00:00`), "MMMM yyyy");
    if (monthLabel !== currentMonth) {
      if (currentMonth) {
        months.push({
          label: currentMonth,
          leftPx: monthStart * GANTT_DAY_PX,
          widthPx: (index - monthStart) * GANTT_DAY_PX,
        });
      }
      currentMonth = monthLabel;
      monthStart = index;
    }
  });

  if (currentMonth) {
    months.push({
      label: currentMonth,
      leftPx: monthStart * GANTT_DAY_PX,
      widthPx: (headers.length - monthStart) * GANTT_DAY_PX,
    });
  }

  return { days: headers, months };
}

export function PlanCalendarGanttView({
  rows,
  timelineStart,
  todayDay,
  canEdit,
  conflictBarIds,
  onBarMove,
}: {
  rows: GanttSeRow[];
  timelineStart: string;
  todayDay: number;
  canEdit: boolean;
  conflictBarIds: Set<string>;
  onBarMove: (seId: string, barId: string, newStartDay: number) => void;
}) {
  const ganttRowsRef = useRef<HTMLDivElement>(null);
  const { days: headerDays, months: headerMonths } = useMemo(
    () => buildMonthHeaders(timelineStart, GANTT_TOTAL_DAYS),
    [timelineStart],
  );
  const ganttTotalWidth = GANTT_LABEL_WIDTH + GANTT_TOTAL_DAYS * GANTT_DAY_PX;
  const timelineEnd = addCalendarDays(timelineStart, GANTT_TOTAL_DAYS - 1);

  useEffect(() => {
    const gantt = ganttRowsRef.current;
    if (!gantt || !canEdit) return;

    let drag: {
      el: HTMLElement;
      barId: string;
      seId: string;
      startX: number;
      origLeft: number;
      currentLeft: number;
    } | null = null;

    const onMouseDown = (event: MouseEvent) => {
      const bar = (event.target as HTMLElement).closest<HTMLElement>("[data-bar-id]");
      if (!bar) return;
      event.preventDefault();
      const origLeft = Number.parseInt(bar.style.left, 10) || 0;
      drag = {
        el: bar,
        barId: bar.dataset.barId!,
        seId: bar.dataset.seId!,
        startX: event.clientX,
        origLeft,
        currentLeft: origLeft,
      };
      bar.style.opacity = "0.6";
      bar.style.cursor = "grabbing";
      bar.style.zIndex = "50";
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!drag) return;
      const newLeft = Math.max(0, drag.origLeft + (event.clientX - drag.startX));
      drag.el.style.left = `${newLeft}px`;
      drag.currentLeft = newLeft;
    };

    const onMouseUp = () => {
      if (!drag) return;
      const snappedDay = Math.round(drag.currentLeft / GANTT_DAY_PX);
      drag.el.style.left = `${snappedDay * GANTT_DAY_PX}px`;
      drag.el.style.opacity = "";
      drag.el.style.cursor = "";
      drag.el.style.zIndex = "";
      onBarMove(drag.seId, drag.barId, snappedDay);
      drag = null;
    };

    gantt.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      gantt.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [canEdit, onBarMove, rows]);

  const renderBar = (bar: GanttBarLayout, se: GanttSeRow) => {
    const color = BAR_COLORS[bar.type];
    const leftPx = bar.startDay * GANTT_DAY_PX;
    const hasConflict = conflictBarIds.has(bar.id);

    if (bar.type === "gate") {
      return (
        <div key={bar.id}>
          <div
            className="pointer-events-none absolute z-[8]"
            style={{ left: leftPx - 7, top: bar.topPx }}
            title={bar.label}
          >
            <div
              className="h-3.5 w-3.5"
              style={{
                background: hasConflict ? "#B83128" : color,
                transform: "rotate(45deg)",
              }}
            />
          </div>
          <div
            className="pointer-events-none absolute z-[8] max-w-[72px] truncate whitespace-nowrap font-mono text-[7px]"
            style={{ left: leftPx - 10, top: bar.topPx + 16, color: hasConflict ? "#B83128" : color }}
          >
            {bar.label}
          </div>
          {hasConflict ? (
            <div
              className="pointer-events-none absolute z-20 h-2 w-2 rounded-full border-[1.5px] border-white bg-[#B83128]"
              style={{ left: leftPx - 4, top: bar.topPx - 4 }}
            />
          ) : null}
        </div>
      );
    }

    const widthPx = Math.max((bar.days ?? 1) * GANTT_DAY_PX, 24);
    const pct = bar.pct ?? 100;
    const rgbaSet = BAR_RGBA[color] ?? ["rgba(128,128,128,.88)", "rgba(128,128,128,.28)"];
    const bgColor = pct === 100 ? rgbaSet[0] : rgbaSet[1];
    const progressWidth = Math.round((pct * widthPx) / 100);
    const showLabel = widthPx >= 40;
    const shortLabel = bar.label.length > 20 ? `${bar.label.slice(0, 18)}…` : bar.label;

    return (
      <div
        className="absolute overflow-hidden select-none"
        data-bar-id={bar.id}
        data-se-id={se.id}
        key={bar.id}
        style={{
          left: leftPx,
          width: widthPx,
          top: bar.topPx,
          height: bar.heightPx,
          background: bgColor,
          zIndex: bar.track === "content" ? 3 : 5,
          cursor: canEdit ? "grab" : "default",
        }}
        title={bar.label}
      >
        <div className="absolute inset-y-0 left-0" style={{ width: progressWidth, background: color }} />
        {showLabel ? (
          <div className="absolute inset-0 flex items-center overflow-hidden px-1">
            <span className="truncate font-mono text-[7.5px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,.25)]">
              {shortLabel}
            </span>
          </div>
        ) : null}
        {hasConflict ? (
          <div className="absolute -right-[3px] -top-[3px] z-20 h-2 w-2 rounded-full border-[1.5px] border-white bg-[#B83128]" />
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex min-w-full flex-col" style={{ minWidth: ganttTotalWidth }}>
          <div className="sticky top-0 z-20 flex border-b-2 border-[#E2DFD9] bg-[#F9F8F6]">
            <div
              className="sticky left-0 z-[21] flex shrink-0 items-end border-r border-[#E2DFD9] bg-[#F9F8F6] px-3.5 pb-1.5"
              style={{ width: GANTT_LABEL_WIDTH }}
            >
              <span className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-[#A09D98]">
                My team · {rows.length} SE{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
              <div className="relative flex h-[22px] border-b border-[#E2DFD9]">
                {headerMonths.map((month) => (
                  <div
                    className="absolute top-0 flex h-[22px] items-center border-r border-[#D4D1CB] px-2"
                    key={month.label}
                    style={{ left: month.leftPx, width: month.widthPx }}
                  >
                    <span className="whitespace-nowrap font-mono text-[8px] font-medium tracking-wide text-[#3D3C38]">
                      {month.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex h-[26px] items-center">
                {headerDays.map((header) => (
                  <div
                    className="flex h-[26px] shrink-0 items-center justify-center border-r border-[#F0EFEB]"
                    key={header.iso}
                    style={{
                      width: GANTT_DAY_PX,
                      background: header.isToday ? "#EFF6FF" : header.isWeekend ? "#F5F4F0" : "transparent",
                    }}
                  >
                    <span
                      className={`font-mono text-[8px] ${header.isToday ? "font-semibold text-[#0071CE]" : header.isWeekend ? "text-[#C4C1BB]" : "text-[#7A7772]"}`}
                    >
                      {header.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div ref={ganttRowsRef}>
            {rows.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-semibold text-[#0D0E12]">No ramp plans to display</p>
                <p className="mt-1 text-[12px] text-[#6B6860]">
                  Assign onboarding plans to see the team Gantt timeline.
                </p>
              </div>
            ) : (
              rows.map((se) => {
                const rowLayout = layoutGanttRow(se.bars);
                return (
                <div
                  className="flex border-b border-[#E2DFD9]"
                  key={se.id}
                  style={{ minHeight: rowLayout.rowHeightPx }}
                >
                  <div
                    className="sticky left-0 z-10 shrink-0 cursor-pointer border-r border-[#E2DFD9] bg-white px-3.5 py-2.5 hover:bg-[#F0F7FF]"
                    style={{ width: GANTT_LABEL_WIDTH, minHeight: rowLayout.rowHeightPx }}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <Avatar bg={se.avatarBg} initials={se.initials} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-semibold text-[#0D0E12]">{se.name}</div>
                        <div className="font-mono text-[8px] text-[#A09D98]">
                          Day {se.dayInRamp} · {se.planName}
                        </div>
                      </div>
                    </div>
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className="font-mono text-[7.5px] tracking-wide"
                        style={{ color: se.healthColor, background: se.healthBg, padding: "2px 6px" }}
                      >
                        {se.healthLabel}
                      </span>
                      <span className="font-mono text-[9px] font-medium text-[#3D3C38]">{se.rampPct}%</span>
                    </div>
                    <RampBar color={rampColor(se.health)} pct={se.rampPct} />
                  </div>

                  <div
                    className="relative min-w-0 flex-1"
                    style={{ minHeight: rowLayout.rowHeightPx }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 z-[1]"
                      style={{
                        background: `repeating-linear-gradient(90deg, transparent 0, transparent ${5 * GANTT_DAY_PX}px, rgba(0,0,0,.025) ${5 * GANTT_DAY_PX}px, rgba(0,0,0,.025) ${7 * GANTT_DAY_PX}px)`,
                      }}
                    />
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 z-[9] w-0.5 bg-[#0071CE]"
                      style={{ left: todayDay * GANTT_DAY_PX }}
                    >
                      <span className="absolute left-[3px] top-0.5 whitespace-nowrap font-mono text-[7px] tracking-wide text-[#0071CE]">
                        TODAY
                      </span>
                    </div>
                    {rowLayout.bars.map((bar) => renderBar(bar, se))}
                  </div>
                </div>
                );
              })
            )}

            <div className="flex h-7 border-t-2 border-[#E2DFD9] bg-[#F9F8F6]">
              <div
                className="sticky left-0 z-10 flex shrink-0 items-center border-r border-[#E2DFD9] bg-[#F9F8F6] px-3.5"
                style={{ width: GANTT_LABEL_WIDTH }}
              >
                <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-[#A09D98]">Segments</span>
              </div>
              <div className="relative min-w-0 flex-1">
                {[
                  { label: "SEG 1 · Days 1–30", left: 0, color: "#0057a8" },
                  { label: "SEG 2 · Days 31–60", left: 30 * GANTT_DAY_PX, color: "#A51E8E" },
                  { label: "SEG 3 · Days 61–90", left: 60 * GANTT_DAY_PX, color: "#0A6E45" },
                ].map((seg) => (
                  <div
                    className="absolute inset-y-0 flex items-center border-r border-dashed border-black/10 pl-2"
                    key={seg.label}
                    style={{ left: seg.left, width: 30 * GANTT_DAY_PX }}
                  >
                    <span
                      className="whitespace-nowrap font-mono text-[7.5px] tracking-wide"
                      style={{ color: seg.color }}
                    >
                      {seg.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[30px] shrink-0 items-center justify-end border-t border-[#E2DFD9] bg-white px-5">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#0A6E45]" />
          <span className="font-mono text-[9px] text-[#6B6860]">
            {format(new Date(`${timelineStart}T12:00:00`), "MMM d")} –{" "}
            {format(new Date(`${timelineEnd}T12:00:00`), "MMM d, yyyy")} · {GANTT_TOTAL_DAYS} days
          </span>
        </div>
      </div>
    </div>
  );
}
