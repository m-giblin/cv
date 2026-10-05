"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlanCalendarGanttView } from "@/components/plans/plan-calendar-gantt-view";
import { PlanCalendarIntelStrip } from "@/components/plans/plan-calendar-intel-strip";
import { PlanCalendarTeamView } from "@/components/plans/plan-calendar-team-view";
import { TABLE_HEAD_CLS } from "@/components/se/form-classes";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import type { AccessTier } from "@/lib/auth/rbac";
import { addCalendarDays, bizToDate } from "@/lib/plans/business-days";
import { detectPlanCalendarConflicts } from "@/lib/plans/plan-calendar-conflicts";
import { calendarRowsFromPlans, type CalendarPlanRow } from "@/lib/plans/plan-calendar-data";
import { BAR_STYLES, CALENDAR_LEGEND, type BarStyle } from "@/lib/plans/plan-calendar-colors";
import {
  buildGanttRows,
  dueOffsetFromBarStart,
  shiftBarToMonday,
  todayDayIndex,
  type GanttBar,
} from "@/lib/plans/plan-calendar-gantt";
import type { Profile, UserPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

type CalendarView = "timeline" | "month" | "team";
type CalendarRole = "manager" | "se" | "mentor";

const ROLE_OPTIONS: { id: CalendarRole; label: string }[] = [
  { id: "manager", label: "Manager" },
  { id: "se", label: "SE view" },
  { id: "mentor", label: "Mentor" },
];

const VIEW_OPTIONS: { id: CalendarView; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "month", label: "Month" },
  { id: "team", label: "Team" },
];

type PlanHoliday = { id: string; date: string; label: string };

type PendingChange = {
  assignmentId: string;
  startDate?: string;
  steps: Array<{ assignmentStepId: string; dueOffset: number }>;
};

function roleFromTier(tier: AccessTier): CalendarRole {
  if (tier === "manager" || tier === "admin" || tier === "super_admin") return "manager";
  return "se";
}

export function PlanCalendarWorkspace({
  tier,
  currentUserId,
  plans,
  profiles,
  orgProfiles,
  initialPreviewUserId = null,
}: {
  tier: AccessTier;
  currentUserId: string;
  plans: UserPlan[];
  profiles: Profile[];
  orgProfiles: Profile[];
  initialPreviewUserId?: string | null;
}) {
  const router = useRouter();

  const [view, setView] = useState<CalendarView>("timeline");
  const [roleView, setRoleView] = useState<CalendarRole>(roleFromTier(tier));
  const [previewUserId, setPreviewUserId] = useState<string | null>(initialPreviewUserId);
  const [holidays, setHolidays] = useState<PlanHoliday[]>([]);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [localRows, setLocalRows] = useState<CalendarPlanRow[]>([]);
  const [ganttOverrides, setGanttOverrides] = useState<Record<string, GanttBar[]>>({});
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [saving, setSaving] = useState(false);

  const canEdit =
    roleView === "manager" && (tier === "manager" || tier === "admin" || tier === "super_admin");

  const baseRows = useMemo(() => calendarRowsFromPlans(plans, profiles), [plans, profiles]);

  useEffect(() => {
    setLocalRows(baseRows);
    setGanttOverrides({});
    setPending(null);
    setPendingCount(0);
  }, [baseRows]);

  useEffect(() => {
    setPreviewUserId(initialPreviewUserId);
  }, [initialPreviewUserId]);

  useEffect(() => {
    const refreshPlans = () => router.refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshPlans();
    };
    window.addEventListener("focus", refreshPlans);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refreshPlans);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  useEffect(() => {
    if (tier === "se") {
      setRoleView("se");
      setPreviewUserId(currentUserId);
    }
  }, [tier, currentUserId]);

  useEffect(() => {
    void fetch("/api/plans/holidays")
      .then((r) => (r.ok ? r.json() : { holidays: [] }))
      .then((body: { holidays?: PlanHoliday[] }) => setHolidays(body.holidays ?? []))
      .catch(() => setHolidays([]));
  }, []);

  const visibleCalendarRows = useMemo(() => {
    if (tier === "se") return localRows.filter((row) => row.userId === currentUserId);
    return localRows;
  }, [localRows, tier, currentUserId]);

  const filterContext = useMemo(() => {
    if (tier === "se" || roleView === "se") {
      const userId = tier === "se" ? currentUserId : previewUserId ?? orgProfiles[0]?.id ?? null;
      return { singleUserId: userId, mentorOnlyUserId: null as string | null, mentorView: false };
    }
    if (roleView === "mentor") {
      return { singleUserId: null, mentorOnlyUserId: currentUserId, mentorView: true };
    }
    return { singleUserId: null, mentorOnlyUserId: null, mentorView: false };
  }, [tier, roleView, currentUserId, previewUserId, orgProfiles]);

  const { rows: ganttRows, timelineStart } = useMemo(
    () =>
      buildGanttRows({
        calendarRows: visibleCalendarRows,
        plans,
        profiles,
        ...filterContext,
      }),
    [visibleCalendarRows, plans, profiles, filterContext],
  );

  const displayRows = useMemo(
    () =>
      ganttRows.map((row) => ({
        ...row,
        bars: ganttOverrides[row.id] ?? row.bars,
      })),
    [ganttRows, ganttOverrides],
  );

  const conflicts = useMemo(() => detectPlanCalendarConflicts(displayRows), [displayRows]);
  const conflictBarIds = useMemo(
    () =>
      new Set(
        conflicts
          .map((c) => c.barId)
          .filter((barId): barId is string => Boolean(barId)),
      ),
    [conflicts],
  );
  const todayDay = todayDayIndex(timelineStart);

  const queueStepUpdate = useCallback(
    (assignmentId: string, assignmentStepId: string, dueOffset: number) => {
      setPending((prev) => {
        const base = prev?.assignmentId === assignmentId ? prev : { assignmentId, steps: [] };
        const steps = base.steps.filter((s) => s.assignmentStepId !== assignmentStepId);
        steps.push({ assignmentStepId, dueOffset });
        return { ...base, steps };
      });
      setPendingCount((n) => n + 1);

      setLocalRows((rows) =>
        rows.map((row) => {
          if (row.assignmentId !== assignmentId) return row;
          return {
            ...row,
            steps: row.steps.map((step) =>
              step.assignmentStepId === assignmentStepId
                ? { ...step, dueOffset, dueDate: bizToDate(row.startDate, dueOffset) }
                : step,
            ),
          };
        }),
      );
    },
    [],
  );

  const saveChanges = async () => {
    if (!pending) {
      toast.message("No pending changes");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/plans/assignments/${pending.assignmentId}/calendar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: pending.startDate,
          steps: pending.steps,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Save failed");
      }
      toast.success("Calendar updated");
      setPending(null);
      setPendingCount(0);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleBarMove = useCallback(
    (seId: string, barId: string, newStartDay: number) => {
      if (!canEdit) return;

      const seRow = displayRows.find((row) => row.id === seId);
      const bar = seRow?.bars.find((item) => item.id === barId);
      if (!seRow || !bar?.assignmentStepId) return;

      const dueOffset = dueOffsetFromBarStart(
        plans.find((p) => p.id === seRow.assignmentId)?.startDate ??
          localRows.find((r) => r.assignmentId === seRow.assignmentId)?.startDate ??
          timelineStart,
        timelineStart,
        newStartDay,
        bar.days ?? 1,
      );

      setGanttOverrides((prev) => {
        const current = prev[seId] ?? seRow.bars;
        return {
          ...prev,
          [seId]: current.map((item) =>
            item.id === barId ? { ...item, startDay: newStartDay } : item,
          ),
        };
      });

      queueStepUpdate(seRow.assignmentId, bar.assignmentStepId, dueOffset);
    },
    [canEdit, displayRows, localRows, plans, queueStepUpdate, timelineStart],
  );

  const applyConflictAction = (conflict: (typeof conflicts)[number]) => {
    if (conflict.id.startsWith("no-mentor")) {
      router.push(`/manager/team?userId=${conflict.seId}`);
      return;
    }
    if (conflict.id.startsWith("pace-")) {
      router.push(`/manager/programs?userId=${conflict.seId}`);
      return;
    }
    if (conflict.barId) {
      const seRow = displayRows.find((row) => row.id === conflict.seId);
      const bar = seRow?.bars.find((item) => item.id === conflict.barId);
      if (seRow && bar) {
        const mondayDay = shiftBarToMonday(bar);
        handleBarMove(conflict.seId, conflict.barId, mondayDay);
      }
    }
    setDismissedAlerts((prev) => [...prev, conflict.id]);
  };

  const blockDay = async () => {
    if (!canEdit) return;
    const dateIso = format(new Date(), "yyyy-MM-dd");
    try {
      const response = await fetch("/api/plans/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateIso, label: "Blocked day" }),
      });
      if (!response.ok) throw new Error("Failed to block day");
      const body = (await response.json()) as PlanHoliday;
      setHolidays((prev) => [...prev.filter((h) => h.date !== body.date), body]);
      toast.success(`Blocked ${format(parseISO(dateIso), "MMM d")}`);
    } catch {
      toast.error("Could not block day");
    }
  };

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [monthCursor]);

  const monthEventsForDay = (date: Date) => {
    const iso = format(date, "yyyy-MM-dd");
    const events: { style: BarStyle; label: string }[] = [];
    for (const se of displayRows) {
      for (const bar of se.bars) {
        const barDate = addCalendarDays(timelineStart, bar.startDay);
        if (barDate === iso) {
          events.push({
            style: BAR_STYLES[bar.type],
            label: `${se.initials}: ${bar.label}`,
          });
        }
      }
    }
    return events.slice(0, 4);
  };

  const dragHint =
    roleView === "manager" && canEdit ? "Drag bars to shift dates" : "Read-only view";

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-[14px] border border-line bg-white">
      {/* Topbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {tier !== "se" ? (
            <SegmentedToggle
              label="Calendar perspective"
              onChange={(id) => setRoleView(id as CalendarRole)}
              options={ROLE_OPTIONS}
              value={roleView}
            />
          ) : null}
          {roleView === "se" && tier !== "se" && orgProfiles.length > 1 ? (
            <select
              aria-label="Preview SE"
              className="cursor-pointer rounded-[10px] border-[1.5px] border-line-strong bg-white px-3 py-1.5 text-sm text-ink focus:border-blue"
              onChange={(e) => setPreviewUserId(e.target.value)}
              value={previewUserId ?? orgProfiles[0]?.id ?? ""}
            >
              {orgProfiles.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={() => void blockDay()} type="button">
              + Block / Holiday
            </button>
            <button
              className="btn-primary"
              disabled={!pending || saving}
              onClick={() => void saveChanges()}
              type="button"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        ) : null}
      </div>

      <PlanCalendarIntelStrip
        conflicts={conflicts}
        dismissedIds={dismissedAlerts}
        onCta={applyConflictAction}
        onDismiss={(id) => setDismissedAlerts((prev) => [...prev, id])}
        onDismissAll={() => setDismissedAlerts(conflicts.map((c) => c.id))}
      />

      {/* View tabs + legend */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-2.5">
        <SegmentedToggle
          label="Calendar view"
          onChange={(id) => setView(id as CalendarView)}
          options={VIEW_OPTIONS}
          value={view}
        />
        <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {CALENDAR_LEGEND.map((item) => (
            <li className="flex items-center gap-1.5" key={item.label}>
              <span
                aria-hidden="true"
                className={cn("h-3 w-3 border-[1.5px]", item.diamond ? "rotate-45" : "rounded-[3px]")}
                style={{ background: item.color, borderColor: item.border }}
              />
              <span className="text-xs text-ink-2">{item.label}</span>
            </li>
          ))}
          <li aria-hidden="true" className="h-4 w-px bg-line" />
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger font-mono text-xs leading-none text-white"
            >
              !
            </span>
            <span className="text-xs text-ink-2">Conflict</span>
          </li>
          <li aria-hidden="true" className="h-4 w-px bg-line" />
          <li className="text-xs text-muted">{dragHint}</li>
        </ul>
      </div>

      {view === "timeline" ? (
        <PlanCalendarGanttView
          canEdit={canEdit}
          conflictBarIds={conflictBarIds}
          onBarMove={handleBarMove}
          rows={displayRows}
          timelineStart={timelineStart}
          todayDay={todayDay}
        />
      ) : null}

      {view === "team" ? (
        <PlanCalendarTeamView conflicts={conflicts} rows={displayRows} timelineStart={timelineStart} />
      ) : null}

      {view === "month" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-3.5 flex items-center gap-2.5">
            <button
              className="btn-secondary"
              onClick={() => setMonthCursor((d) => addMonths(d, -1))}
              type="button"
            >
              ← Prev
            </button>
            <h2 className="text-lg font-extrabold text-ink">{format(monthCursor, "MMMM yyyy")}</h2>
            <button
              className="btn-secondary"
              onClick={() => setMonthCursor((d) => addMonths(d, 1))}
              type="button"
            >
              Next →
            </button>
          </div>

          <div className="overflow-hidden rounded-[14px] border border-line">
            <div className={cn("grid grid-cols-7", TABLE_HEAD_CLS)}>
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((label) => (
                <div className="px-2 py-2 text-center" key={label}>
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-divider">
              {monthDays.map((day) => {
                const iso = format(day, "yyyy-MM-dd");
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isToday = isSameDay(day, new Date());
                const isOther = !isSameMonth(day, monthCursor);
                const isHoliday = holidays.some((h) => h.date === iso);
                const events = monthEventsForDay(day);

                return (
                  <div
                    aria-current={isToday ? "date" : undefined}
                    className={cn(
                      "min-h-[96px] p-1.5",
                      isOther ? "bg-surface-2" : isToday ? "bg-signal-soft" : isWeekend ? "bg-bg" : "bg-white",
                    )}
                    key={iso}
                  >
                    <div
                      className={cn(
                        "mb-1 flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs",
                        isToday
                          ? "border-[1.5px] border-ink bg-signal font-bold text-ink"
                          : isOther || isWeekend
                            ? "text-muted"
                            : "text-ink",
                      )}
                    >
                      {format(day, "d")}
                    </div>
                    {isHoliday ? (
                      <div className="mb-0.5 rounded-[6px] bg-warning-soft px-1.5 py-0.5 font-mono text-xs text-warning">
                        ▲ Blocked
                      </div>
                    ) : null}
                    {events.map((event, index) => (
                      <div
                        className="mb-0.5 truncate rounded-[6px] border-[1.5px] px-1.5 py-0.5 font-mono text-xs"
                        key={`${event.label}-${index}`}
                        style={{
                          background: event.style.fill,
                          borderColor: event.style.border,
                          color: event.style.text,
                        }}
                        title={event.label}
                      >
                        {event.label}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Status bar */}
      <div className="flex min-h-[32px] shrink-0 items-center justify-between border-t border-line px-5 py-1.5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-mono text-xs text-muted">
            {pendingCount > 0
              ? `${pendingCount} unsaved change${pendingCount === 1 ? "" : "s"}`
              : "No unsaved changes"}
          </span>
          {conflicts.length > 0 ? (
            <span className="font-mono text-xs text-danger">
              ▲ {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"} need attention
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
