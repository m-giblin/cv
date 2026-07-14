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
import type { AccessTier } from "@/lib/auth/rbac";
import { addCalendarDays, bizToDate } from "@/lib/plans/business-days";
import { detectPlanCalendarConflicts } from "@/lib/plans/plan-calendar-conflicts";
import { calendarRowsFromPlans, type CalendarPlanRow } from "@/lib/plans/plan-calendar-data";
import { BAR_COLORS, CALENDAR_LEGEND } from "@/lib/plans/plan-calendar-colors";
import {
  buildGanttRows,
  dueOffsetFromBarStart,
  shiftBarToMonday,
  todayDayIndex,
  type GanttBar,
} from "@/lib/plans/plan-calendar-gantt";
import type { Profile, UserPlan } from "@/lib/types";

type CalendarView = "timeline" | "month" | "team";
type CalendarRole = "manager" | "se" | "mentor";

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
      router.push(`/manager?section=roster&userId=${conflict.seId}`);
      return;
    }
    if (conflict.id.startsWith("pace-")) {
      router.push(`/manager?section=program&userId=${conflict.seId}`);
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
    const events: { color: string; label: string }[] = [];
    for (const se of displayRows) {
      for (const bar of se.bars) {
        const barDate = addCalendarDays(timelineStart, bar.startDay);
        if (barDate === iso) {
          events.push({
            color: BAR_COLORS[bar.type],
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
    <div className="flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-sm border border-[#E2DFD9] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]">
      {/* Topbar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#E2DFD9] px-5">
        <div className="flex items-center gap-0.5">
          <span className="font-mono text-[10.5px] text-[#A09D98]">Program</span>
          <span className="mx-0.5 text-[11px] text-[#C4C1BB]">›</span>
          <span className="font-mono text-[10.5px] font-medium text-[#3D3C38]">Plan Calendar</span>
        </div>
        <div className="flex items-center gap-2">
          {tier !== "se" ? (
            <div className="flex overflow-hidden border border-[#D4D1CB]">
              {(["manager", "se", "mentor"] as CalendarRole[]).map((role, index) => (
                <button
                  className={`px-3 py-1 font-mono text-[9px] tracking-wide ${
                    roleView === role ? "bg-[#00143A] text-white" : "bg-white text-[#7A7772]"
                  } ${index > 0 ? "border-l border-[#D4D1CB]" : ""}`}
                  key={role}
                  onClick={() => setRoleView(role)}
                  type="button"
                >
                  {role === "manager" ? "MANAGER" : role === "se" ? "SE VIEW" : "MENTOR"}
                </button>
              ))}
            </div>
          ) : null}
          {roleView === "se" && tier !== "se" && orgProfiles.length > 1 ? (
            <select
              className="border border-[#D4D1CB] px-2 py-1 text-[10px] text-[#3D3C38]"
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
          {canEdit ? (
            <>
              <button
                className="inline-flex items-center border border-[#D4D1CB] px-2.5 py-1 text-[10px] font-semibold text-[#3D3C38] hover:border-[#0071CE] hover:text-[#0071CE]"
                onClick={() => void blockDay()}
                type="button"
              >
                + Block / Holiday
              </button>
              <button
                className="inline-flex items-center bg-[#0071CE] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#005aab] disabled:opacity-50"
                disabled={!pending || saving}
                onClick={() => void saveChanges()}
                type="button"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <PlanCalendarIntelStrip
        conflicts={conflicts}
        dismissedIds={dismissedAlerts}
        onCta={applyConflictAction}
        onDismiss={(id) => setDismissedAlerts((prev) => [...prev, id])}
        onDismissAll={() => setDismissedAlerts(conflicts.map((c) => c.id))}
      />

      {/* View tabs + legend */}
      <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-[#E2DFD9] px-5">
        <div className="flex h-full">
          {(["timeline", "month", "team"] as CalendarView[]).map((mode) => (
            <button
              className={`flex items-center px-3.5 font-mono text-[8.5px] tracking-wide ${
                view === mode
                  ? "border-b-2 border-[#0071CE] text-[#0071CE]"
                  : "border-b-2 border-transparent text-[#A09D98]"
              }`}
              key={mode}
              onClick={() => setView(mode)}
              type="button"
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {CALENDAR_LEGEND.map((item) => (
            <div className="flex items-center gap-1" key={item.label}>
              <span
                className="h-2.5 w-2.5"
                style={{
                  background: item.color,
                  transform: item.diamond ? "rotate(45deg)" : undefined,
                }}
              />
              <span className="text-[9.5px] capitalize text-[#7A7772]">{item.label}</span>
            </div>
          ))}
          <div className="h-4 w-px bg-[#E2DFD9]" />
          <span className="font-mono text-[8px] text-[#B83128]">● Conflict</span>
          <div className="h-4 w-px bg-[#E2DFD9]" />
          <span className="text-[9.5px] text-[#A09D98]">{dragHint}</span>
        </div>
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
              className="inline-flex items-center border border-[#D4D1CB] px-2 py-1 text-[9px] font-semibold text-[#3D3C38] hover:border-[#0071CE]"
              onClick={() => setMonthCursor((d) => addMonths(d, -1))}
              type="button"
            >
              ← Prev
            </button>
            <span className="font-display text-lg font-bold text-[#0D0E12]">
              {format(monthCursor, "MMMM yyyy")}
            </span>
            <button
              className="inline-flex items-center border border-[#D4D1CB] px-2 py-1 text-[9px] font-semibold text-[#3D3C38] hover:border-[#0071CE]"
              onClick={() => setMonthCursor((d) => addMonths(d, 1))}
              type="button"
            >
              Next →
            </button>
          </div>

          <div className="mb-px grid grid-cols-7 gap-px border border-[#E2DFD9] bg-[#E2DFD9]">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((label) => (
              <div
                className="bg-[#F9F8F6] px-2 py-1.5 text-center font-mono text-[8px] tracking-wide text-[#A09D98]"
                key={label}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px border border-[#E2DFD9] bg-[#E2DFD9]">
            {monthDays.map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isToday = isSameDay(day, new Date());
              const isOther = !isSameMonth(day, monthCursor);
              const isHoliday = holidays.some((h) => h.date === iso);
              const events = monthEventsForDay(day);

              return (
                <div
                  className={`min-h-[90px] p-1.5 ${
                    isOther ? "bg-[#F5F4F0]" : isToday ? "bg-[#EFF6FF]" : isWeekend ? "bg-[#F9F8F6]" : "bg-white"
                  }`}
                  key={iso}
                >
                  <div
                    className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] ${
                      isToday
                        ? "bg-[#0071CE] font-bold text-white"
                        : isOther
                          ? "text-[#C4C1BB]"
                          : isWeekend
                            ? "text-[#A09D98]"
                            : "text-[#0D0E12]"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  {isHoliday ? (
                    <div className="mb-0.5 rounded-sm bg-[#FFFBF0] px-1 text-[8px] text-[#D4810A]">Blocked</div>
                  ) : null}
                  {events.map((event, index) => (
                    <div
                      className="mb-0.5 truncate rounded-sm px-1.5 py-0.5 font-mono text-[9px] text-white"
                      key={`${event.label}-${index}`}
                      style={{ background: event.color }}
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
      ) : null}

      {/* Status bar */}
      <div className="flex h-[30px] shrink-0 items-center justify-between border-t border-[#E2DFD9] px-5">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[9px] text-[#A09D98]">
            {pendingCount > 0
              ? `${pendingCount} unsaved change${pendingCount === 1 ? "" : "s"}`
              : "No unsaved changes"}
          </span>
          {conflicts.length > 0 ? (
            <span className="font-mono text-[9px] text-[#B83128]">
              {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"} need attention
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
