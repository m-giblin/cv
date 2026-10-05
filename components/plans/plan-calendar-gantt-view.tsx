"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { addCalendarDays, buildDayHeaders } from "@/lib/plans/business-days";
import {
  GANTT_DAY_PX,
  GANTT_LABEL_WIDTH,
  GANTT_TOTAL_DAYS,
  HEALTH_TAG,
  layoutGanttRow,
  rampColor,
  type GanttBarLayout,
  type GanttSeRow,
} from "@/lib/plans/plan-calendar-gantt";
import { Tag } from "@/components/ui/tag";
import { BAR_STYLES } from "@/lib/plans/plan-calendar-colors";
import { AVATAR_CLASSNAME } from "@/lib/se/avatar-gradients";
import { cn } from "@/lib/utils";

function Avatar({ initials: label, size = 30 }: { initials: string; size?: number }) {
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

function RampBar({ pct, color, height = 4 }: { pct: number; color: string; height?: number }) {
  return (
    <div className="overflow-hidden rounded-full bg-surface-2" style={{ height }}>
      <div
        className="rounded-full transition-all duration-300"
        style={{ height, width: `${pct}%`, background: color }}
      />
    </div>
  );
}

/** Small "conflict" marker: a symbol in a danger circle so it never relies on colour alone. */
function ConflictMarker({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-label="Conflict"
      className={cn(
        "flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-danger font-mono text-xs leading-none text-white",
        className,
      )}
      role="img"
      style={style}
    >
      !
    </span>
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
    const style = BAR_STYLES[bar.type];
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
              className={cn("h-3.5 w-3.5 rotate-45", hasConflict ? "bg-danger" : "bg-ink")}
            />
          </div>
          <div
            className={cn(
              "pointer-events-none absolute z-[8] max-w-[96px] truncate whitespace-nowrap font-mono text-xs",
              hasConflict ? "text-danger" : "text-ink",
            )}
            style={{ left: leftPx - 10, top: bar.topPx + 16 }}
          >
            ◆ {bar.label}
          </div>
          {hasConflict ? (
            <ConflictMarker className="pointer-events-none absolute z-20" style={{ left: leftPx - 3, top: bar.topPx - 8 }} />
          ) : null}
        </div>
      );
    }

    const widthPx = Math.max((bar.days ?? 1) * GANTT_DAY_PX, 24);
    const pct = bar.pct ?? 100;
    const progressWidth = Math.round((pct * widthPx) / 100);
    const showLabel = widthPx >= 40;
    const shortLabel = bar.label.length > 20 ? `${bar.label.slice(0, 18)}…` : bar.label;

    return (
      <div
        className="absolute select-none overflow-hidden rounded-[6px] border-[1.5px]"
        data-bar-id={bar.id}
        data-se-id={se.id}
        key={bar.id}
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
        title={`${bar.label} · ${pct}%`}
      >
        {pct < 100 ? (
          <div
            className="absolute bottom-0 left-0 h-[3px]"
            style={{ width: progressWidth, background: style.progress }}
          />
        ) : null}
        {showLabel ? (
          <div className="absolute inset-0 flex items-center overflow-hidden pl-1 pr-4">
            <span className="truncate font-mono text-xs leading-none">{shortLabel}</span>
          </div>
        ) : null}
        {hasConflict ? <ConflictMarker className="absolute right-0.5 top-1/2 z-20 -translate-y-1/2" /> : null}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex min-w-full flex-col" style={{ minWidth: ganttTotalWidth }}>
          <div className="sticky top-0 z-20 flex border-b border-line bg-surface-2">
            <div
              className="sticky left-0 z-[21] flex shrink-0 items-end border-r border-line bg-surface-2 px-3.5 pb-1.5"
              style={{ width: GANTT_LABEL_WIDTH }}
            >
              <span className="label-mono">
                My team · {rows.length} SE{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
              <div className="relative flex h-[24px] border-b border-line">
                {headerMonths.map((month) => (
                  <div
                    className="absolute top-0 flex h-[24px] items-center border-r border-line-strong px-2"
                    key={month.label}
                    style={{ left: month.leftPx, width: month.widthPx }}
                  >
                    <span className="whitespace-nowrap font-mono text-xs font-medium text-ink-2">
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
                      header.isToday ? "bg-signal" : header.isWeekend ? "bg-bg" : "bg-transparent",
                    )}
                    key={header.iso}
                    style={{ width: GANTT_DAY_PX }}
                  >
                    <span
                      className={cn(
                        "font-mono text-xs",
                        header.isToday ? "font-bold text-ink" : header.isWeekend ? "text-muted" : "text-ink-2",
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
                <p className="text-sm font-semibold text-ink">No ramp plans to display</p>
                <p className="mt-1 text-[13px] text-muted">
                  Assign onboarding plans to see the team Gantt timeline.
                </p>
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
                    className="sticky left-0 z-10 shrink-0 cursor-pointer border-r border-line bg-white px-3.5 py-2.5 hover:bg-blue-soft"
                    style={{ width: GANTT_LABEL_WIDTH, minHeight: rowLayout.rowHeightPx }}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <Avatar initials={se.initials} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-ink">{se.name}</div>
                        <div className="truncate font-mono text-xs text-muted">
                          Day {se.dayInRamp} · {se.planName}
                        </div>
                      </div>
                    </div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <Tag tone={healthTag.tone}>
                        <span aria-hidden="true">{healthTag.symbol}</span>
                        {se.healthLabel}
                      </Tag>
                      <span className="font-mono text-xs font-medium text-ink-2">{se.rampPct}%</span>
                    </div>
                    <RampBar color={rampColor(se.health)} pct={se.rampPct} />
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
                      className="pointer-events-none absolute bottom-0 top-0 z-[9] w-0.5 bg-blue"
                      style={{ left: todayDay * GANTT_DAY_PX }}
                    >
                      <span className="absolute left-[3px] top-0.5 whitespace-nowrap bg-white/90 px-0.5 font-mono text-xs font-medium text-blue">
                        TODAY
                      </span>
                    </div>
                    {rowLayout.bars.map((bar) => renderBar(bar, se))}
                  </div>
                </div>
                );
              })
            )}

            <div className="flex h-8 border-t border-line bg-surface-2">
              <div
                className="sticky left-0 z-10 flex shrink-0 items-center border-r border-line bg-surface-2 px-3.5"
                style={{ width: GANTT_LABEL_WIDTH }}
              >
                <span className="label-mono">Segments</span>
              </div>
              <div className="relative min-w-0 flex-1">
                {[
                  { label: "SEG 1 · Days 1–30", left: 0 },
                  { label: "SEG 2 · Days 31–60", left: 30 * GANTT_DAY_PX },
                  { label: "SEG 3 · Days 61–90", left: 60 * GANTT_DAY_PX },
                ].map((seg) => (
                  <div
                    className="absolute inset-y-0 flex items-center border-r border-dashed border-dash pl-2"
                    key={seg.label}
                    style={{ left: seg.left, width: 30 * GANTT_DAY_PX }}
                  >
                    <span className="whitespace-nowrap font-mono text-xs text-ink-2">
                      {seg.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[32px] shrink-0 items-center justify-end border-t border-line bg-white px-5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-muted">
            {format(new Date(`${timelineStart}T12:00:00`), "MMM d")} –{" "}
            {format(new Date(`${timelineEnd}T12:00:00`), "MMM d, yyyy")} · {GANTT_TOTAL_DAYS} days
          </span>
        </div>
      </div>
    </div>
  );
}
