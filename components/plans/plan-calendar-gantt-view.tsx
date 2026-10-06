"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { addCalendarDays, buildDayHeaders } from "@/lib/plans/business-days";
import {
  GANTT_DAY_PX,
  GANTT_LABEL_WIDTH,
  GANTT_TOTAL_DAYS,
  HEALTH_TAG,
  layoutGanttRow,
  type GanttBarLayout,
  type GanttSeRow,
} from "@/lib/plans/plan-calendar-gantt";
import { HEALTH_WORD, RAMP_FILL_CLS } from "@/components/plans/plan-calendar-team-view";
import { StatusPill } from "@/components/ui/status-pill";
import { BAR_STYLES } from "@/lib/plans/plan-calendar-colors";
import { cn } from "@/lib/utils";

function Avatar({ initials: label, size = 30 }: { initials: string; size?: number }) {
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-blue-soft text-[12px] font-bold text-blue"
      style={{ width: size, height: size }}
    >
      {label}
    </div>
  );
}

function RampBar({ pct, fillClassName }: { pct: number; fillClassName: string }) {
  return (
    <div aria-hidden className="h-1.5 overflow-hidden rounded-[3px] bg-track">
      <div className={cn("h-full rounded-[3px] transition-all duration-300", fillClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Small "conflict" marker: an exclamation in a danger circle, named for assistive tech. */
function ConflictMarker({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-label="Conflict"
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded-full border border-white bg-danger text-[12px] leading-none font-bold text-white",
        className,
      )}
      role="img"
      style={style}
    >
      !
    </span>
  );
}

function shortDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  if (date.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return date.toLocaleDateString("en-US", opts);
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
      bar.style.boxShadow = "var(--shadow-drag)";
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
      drag.el.style.boxShadow = "";
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
    const style = BAR_STYLES[bar.type];
    const leftPx = bar.startDay * GANTT_DAY_PX;
    const hasConflict = conflictBarIds.has(bar.id);

    const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
      if (!canEdit) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      const next = Math.max(0, bar.startDay + (event.key === "ArrowLeft" ? -step : step));
      onBarMove(se.id, bar.id, next);
    };

    if (bar.type === "gate") {
      return (
        <div
          className="pointer-events-none absolute z-[8] flex items-center gap-1.5"
          key={bar.id}
          style={{ left: Math.max(0, leftPx - 4), top: bar.topPx - 2 }}
          title={`Gate: ${bar.label}`}
        >
          <span className="rounded-[6px] bg-blue px-1.5 py-px text-[12px] leading-[16px] font-bold text-white">Gate</span>
          <span className="max-w-[120px] truncate text-[12px] font-semibold whitespace-nowrap text-ink">{bar.label}</span>
          {hasConflict ? <ConflictMarker className="shrink-0" /> : null}
        </div>
      );
    }

    const widthPx = Math.max((bar.days ?? 1) * GANTT_DAY_PX, 24);
    const pct = bar.pct ?? 100;
    const progressWidth = Math.round((pct * widthPx) / 100);
    const showLabel = widthPx >= 40;
    const shortLabel = bar.label.length > 20 ? `${bar.label.slice(0, 18)}…` : bar.label;
    const accessibleName = `${bar.label}, ${pct}% done${hasConflict ? ", has a conflict" : ""}${
      canEdit ? ". Use the left and right arrow keys to move it a day; hold Shift to move five days" : ""
    }`;

    return (
      <div
        aria-label={accessibleName}
        className="absolute overflow-hidden rounded-[8px] border select-none"
        data-bar-id={bar.id}
        data-se-id={se.id}
        key={bar.id}
        onKeyDown={canEdit ? nudge : undefined}
        role={canEdit ? "button" : "img"}
        style={{
          left: leftPx,
          width: widthPx,
          top: bar.topPx,
          height: bar.heightPx,
          background: style.fill,
          borderColor: style.border,
          color: style.text,
          zIndex: bar.track === "content" ? 3 : 5,
          cursor: canEdit ? "grab" : "default",
        }}
        tabIndex={canEdit ? 0 : undefined}
        title={`${bar.label}, ${pct}% done`}
      >
        {pct < 100 ? (
          <div
            className="absolute bottom-0 left-0 h-[3px]"
            style={{ width: progressWidth, background: style.progress }}
          />
        ) : null}
        {showLabel ? (
          <div className="absolute inset-0 flex items-center overflow-hidden pr-4 pl-1.5">
            <span className="truncate text-[12px] leading-none font-semibold">{shortLabel}</span>
          </div>
        ) : null}
        {hasConflict ? <ConflictMarker className="absolute top-1/2 right-0.5 z-20 -translate-y-1/2" /> : null}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex min-w-full flex-col" style={{ minWidth: ganttTotalWidth }}>
          <div className="sticky top-0 z-20 flex border-b border-line bg-white">
            <div
              className="sticky left-0 z-[21] flex shrink-0 items-end gap-2 border-r border-line bg-white px-3.5 pb-2"
              style={{ width: GANTT_LABEL_WIDTH }}
            >
              <span className="th">My team</span>
              <span className="num text-[13px] text-muted">
                {rows.length} {rows.length === 1 ? "person" : "people"}
              </span>
            </div>
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
              <div className="relative flex h-[28px] border-b border-divider">
                {headerMonths.map((month) => (
                  <div
                    className="absolute top-0 flex h-[28px] items-center border-r border-line px-2"
                    key={month.label}
                    style={{ left: month.leftPx, width: month.widthPx }}
                  >
                    <span className="text-[13px] font-semibold whitespace-nowrap text-ink-2">
                      {month.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex h-[26px] items-center">
                {headerDays.map((header) => (
                  <div
                    className={cn(
                      "flex h-[26px] shrink-0 items-center justify-center border-r border-divider",
                      header.isToday ? "bg-ink" : header.isWeekend ? "bg-bg" : "bg-transparent",
                    )}
                    key={header.iso}
                    style={{ width: GANTT_DAY_PX }}
                  >
                    <span
                      className={cn(
                        "num text-[12px]",
                        header.isToday ? "font-bold text-white" : "text-muted",
                      )}
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
                <p className="text-[15px] font-bold text-ink">No ramp plans to show</p>
                <p className="mt-1 text-sm text-muted">Assign a ramp plan to see the team timeline.</p>
              </div>
            ) : (
              rows.map((se) => {
                const rowLayout = layoutGanttRow(se.bars);
                const healthTag = HEALTH_TAG[se.health];
                return (
                <div
                  className="flex border-b border-divider"
                  key={se.id}
                  style={{ minHeight: rowLayout.rowHeightPx }}
                >
                  <div
                    className="sticky left-0 z-10 flex shrink-0 flex-col gap-2 border-r border-line bg-white px-3.5 py-2.5"
                    style={{ width: GANTT_LABEL_WIDTH, minHeight: rowLayout.rowHeightPx }}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar initials={se.initials} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-ink">{se.name}</div>
                        <div className="truncate text-[12px] text-muted" title={se.planName}>
                          Day {se.dayInRamp} of {se.planName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <StatusPill tone={healthTag.tone}>{HEALTH_WORD[se.health]}</StatusPill>
                      <span className="num text-[13px] font-semibold text-ink-2">{se.rampPct}%</span>
                    </div>
                    <RampBar fillClassName={RAMP_FILL_CLS[se.health]} pct={se.rampPct} />
                  </div>

                  <div
                    className="relative min-w-0 flex-1"
                    style={{ minHeight: rowLayout.rowHeightPx }}
                  >
                    {headerDays.map((header, index) =>
                      header.isWeekend ? (
                        <div
                          className="pointer-events-none absolute inset-y-0 z-[1] bg-bg"
                          key={header.iso}
                          style={{ left: index * GANTT_DAY_PX, width: GANTT_DAY_PX }}
                        />
                      ) : null,
                    )}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute top-0 bottom-0 z-[9] w-0.5 bg-ink"
                      style={{ left: todayDay * GANTT_DAY_PX }}
                    >
                      <span className="absolute top-0.5 left-[4px] rounded-[4px] bg-white/90 px-1 text-[12px] font-bold whitespace-nowrap text-ink">
                        Today
                      </span>
                    </div>
                    {rowLayout.bars.map((bar) => renderBar(bar, se))}
                  </div>
                </div>
                );
              })
            )}

            <div className="flex h-9 border-t border-line bg-white">
              <div
                className="sticky left-0 z-10 flex shrink-0 items-center border-r border-line bg-white px-3.5"
                style={{ width: GANTT_LABEL_WIDTH }}
              >
                <span className="th">Segments</span>
              </div>
              <div className="relative min-w-0 flex-1">
                {[
                  { label: "Segment 1, days 1 to 30", left: 0 },
                  { label: "Segment 2, days 31 to 60", left: 30 * GANTT_DAY_PX },
                  { label: "Segment 3, days 61 to 90", left: 60 * GANTT_DAY_PX },
                ].map((seg) => (
                  <div
                    className="absolute inset-y-0 flex items-center border-r border-dashed border-line-strong pl-2"
                    key={seg.label}
                    style={{ left: seg.left, width: 30 * GANTT_DAY_PX }}
                  >
                    <span className="text-[13px] whitespace-nowrap text-muted">
                      {seg.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-[36px] shrink-0 items-center justify-end border-t border-line bg-white px-5 py-2">
        <span className="text-[13px] text-muted">
          Showing {GANTT_TOTAL_DAYS} days, {shortDate(timelineStart)} to {shortDate(timelineEnd)}.
        </span>
      </div>
    </div>
  );
}
