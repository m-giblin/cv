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
import { SelectInput } from "@/components/admin/admin-ui";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { StatusPill } from "@/components/ui/status-pill";
import { thCls } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
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
  { id: "se", label: "SE" },
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
      toast.message("Nothing to save yet");
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
      toast.success(
        `Blocked ${parseISO(dateIso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`,
      );
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
    roleView === "manager" && canEdit
      ? "Drag a bar, or focus it and use the arrow keys, to shift its dates."
      : "Read only.";

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-[14px] border border-line bg-white">
      {/* Topbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {tier !== "se" ? (
            <SegmentedToggle
              label="Calendar perspective"
              onChange={(id) => setRoleView(id as CalendarRole)}
              options={ROLE_OPTIONS}
              value={roleView}
            />
          ) : null}
          {roleView === "se" && tier !== "se" && orgProfiles.length > 1 ? (
            <SelectInput
              aria-label="Preview as"
              className="w-auto cursor-pointer py-1.5 text-sm"
              onChange={(e) => setPreviewUserId(e.target.value)}
              value={previewUserId ?? orgProfiles[0]?.id ?? ""}
            >
              {orgProfiles.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </SelectInput>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-secondary" onClick={() => void blockDay()} type="button">
              Block today
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
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <SegmentedToggle
          label="Calendar view"
          onChange={(id) => setView(id as CalendarView)}
          options={VIEW_OPTIONS}
          value={view}
        />
        <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {CALENDAR_LEGEND.map((item) => (
            <li className="flex items-center gap-1.5" key={item.label}>
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-[3px] border"
                style={{ background: item.color, borderColor: item.border }}
              />
              <span className="text-[13px] text-ink-2">{item.label}</span>
            </li>
          ))}
          <li aria-hidden="true" className="h-4 w-px bg-line" />
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[12px] leading-none font-bold text-white"
            >
              !
            </span>
            <span className="text-[13px] text-ink-2">Conflict</span>
          </li>
          <li aria-hidden="true" className="h-4 w-px bg-line" />
          <li className="text-[13px] text-muted">{dragHint}</li>
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
          <div className="mb-4 flex items-center gap-3">
            <button
              aria-label="Previous month"
              className="btn-secondary"
              onClick={() => setMonthCursor((d) => addMonths(d, -1))}
              type="button"
            >
              Previous
            </button>
            <h2 aria-live="polite" className="min-w-[10ch] text-center text-xl font-extrabold text-ink">
              {format(monthCursor, "MMMM yyyy")}
            </h2>
            <button
              aria-label="Next month"
              className="btn-secondary"
              onClick={() => setMonthCursor((d) => addMonths(d, 1))}
              type="button"
            >
              Next
            </button>
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
            <div className="min-w-[700px]">
            <div className="grid grid-cols-7">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                <div className={cn(thCls, "px-2 text-center")} key={label}>
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
                      "min-h-[104px] p-2",
                      isOther || isWeekend ? "bg-bg" : "bg-white",
                    )}
                    key={iso}
                  >
                    <div
                      className={cn(
                        "num mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[13px]",
                        isToday
                          ? "bg-ink font-bold text-white"
                          : isOther || isWeekend
                            ? "text-muted"
                            : "font-semibold text-ink",
                      )}
                    >
                      {format(day, "d")}
                    </div>
                    {isHoliday ? (
                      <Tag className="mb-1 px-2 py-0.5" tone="warning">
                        Blocked
                      </Tag>
                    ) : null}
                    {events.map((event, index) => (
                      <div
                        className="mb-1 truncate rounded-[8px] border px-1.5 py-0.5 text-[12px] font-semibold"
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
        </div>
      ) : null}

      {/* Status bar */}
      <div className="flex min-h-[36px] shrink-0 items-center justify-between border-t border-line px-5 py-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[13px] text-muted">
            {pendingCount > 0
              ? `${pendingCount} unsaved change${pendingCount === 1 ? "" : "s"}`
              : "No unsaved changes"}
          </span>
          {conflicts.length > 0 ? (
            <StatusPill tone="danger">
              {conflicts.length} {conflicts.length === 1 ? "conflict needs" : "conflicts need"} attention
            </StatusPill>
          ) : null}
        </div>
      </div>
    </div>
  );
}
