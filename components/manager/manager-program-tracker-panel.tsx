"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  healthTag,
  InitialsAvatar,
  ProgramTrackerSeDrawer,
  programStatusTag,
  TrackerProgressBar,
  trackerCopy,
} from "@/components/manager/program-tracker-se-drawer";
import type { CertReviewItem } from "@/components/manager/cert-review-item";
import type { PlanStepReviewItem } from "@/components/manager/plan-step-review-panel";
import { Chip } from "@/components/ui/chip";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Stat, StatStrip } from "@/components/ui/stat";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { FilterBar, PersonCell, rowHighlight, TableCard, tdCls, thCls, TwoLineCell } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import type { MilestoneNudgeStatus } from "@/lib/manager/milestone-actions";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { addCalendarDays } from "@/lib/plans/business-days";
import {
  buildProgramTrackerView,
  classifyMilestoneDueDate,
  PROGRAM_PHASE_DEFINITIONS,
  type MilestoneBucket,
  type MilestoneItemView,
  type ProgramTrackerTab,
} from "@/lib/plans/program-tracker-view";
import type { ActivityLog, DevelopmentPlan, Profile, UserPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "Thu, Oct 9" from a yyyy-mm-dd date (noon avoids timezone drift). */
function formatMilestoneDate(iso: string): string {
  return format(new Date(`${iso}T12:00:00`), "EEE, MMM d");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type RescheduleResult = {
  previousDueDate: string;
  newDueDate: string;
  shiftDays: number;
  anchoredFrom: string;
  mode: "quick" | "custom";
};

const BUCKET_SENTENCE: Record<MilestoneBucket, string> = {
  overdue: "It's still overdue.",
  thisWeek: "It's now due this week.",
  upcoming: "It's now due in the next 2 weeks.",
  later: "It's now due later.",
};

function rescheduleToastMessage(item: MilestoneItemView, data: RescheduleResult): string {
  const from = formatMilestoneDate(data.previousDueDate);
  const to = formatMilestoneDate(data.newDueDate);
  const where = BUCKET_SENTENCE[classifyMilestoneDueDate(data.newDueDate)];
  if (data.mode === "custom") {
    return `${item.label} moved from ${from} to ${to}. ${where}`;
  }
  const anchorNote =
    data.anchoredFrom === data.previousDueDate
      ? `${data.shiftDays} days later`
      : `${data.shiftDays} days from today`;
  return `${item.label} moved from ${from} to ${to}, ${anchorNote}. ${where}`;
}

function planCalendarHref(userId: string): string {
  return `/plan-calendar?se=${encodeURIComponent(userId)}`;
}

/** Small secondary pill for dense rows (btn-secondary is too large for table cells). */
const PILL =
  "inline-flex items-center rounded-full border border-line-strong bg-white px-3 py-1 text-[13px] font-semibold whitespace-nowrap text-ink no-underline hover:border-ink disabled:cursor-not-allowed disabled:text-muted disabled:hover:border-line-strong";

const LINE_CARD = "overflow-hidden rounded-[14px] border border-line bg-white";

const QUARTERS = ["Q3 FY2026", "Q2 FY2026", "All"];

const TRACKER_TABS: Array<{ id: ProgramTrackerTab; label: string }> = [
  { id: "cohort", label: "Cohort" },
  { id: "programs", label: "Programs" },
  { id: "milestones", label: "Milestones" },
];

const PHASE_HEADERS = [
  ["Phase 1", "Foundations, weeks 1 to 2"],
  ["Phase 2", "Technical depth, weeks 3 to 4"],
  ["Phase 3", "Field application, weeks 5 to 6"],
  ["Phase 4", "Cert gates, ongoing"],
] as const;

const PHASE_TONE: Record<string, StatusTone> = {
  complete: "success",
  active: "blue",
  blocked: "danger",
  upcoming: "neutral",
};

type MilestoneFilter = "all" | MilestoneBucket;

export function ManagerProgramTrackerPanel({
  org,
  plans,
  coachingByUser = {},
  approvedCertCountByUser = {},
  developmentPlans = [],
  activity = [],
  planSteps = [],
  certReviewItems = [],
}: {
  org: Profile[];
  plans: UserPlan[];
  coachingByUser?: Record<string, SeCoachingSummary>;
  approvedCertCountByUser?: Record<string, number>;
  developmentPlans?: DevelopmentPlan[];
  activity?: ActivityLog[];
  planSteps?: PlanStepReviewItem[];
  certReviewItems?: CertReviewItem[];
}) {
  const [milestoneFilter, setMilestoneFilter] = useState<MilestoneFilter>("all");
  const router = useRouter();
  const [tab, setTab] = useState<ProgramTrackerTab>("cohort");
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [quarterIdx, setQuarterIdx] = useState(0);
  const [nudgeStatus, setNudgeStatus] = useState<Record<string, MilestoneNudgeStatus>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [datePickerStepId, setDatePickerStepId] = useState<string | null>(null);

  const view = useMemo(
    () =>
      buildProgramTrackerView({
        org,
        plans,
        coachingByUser,
        approvedCertCountByUser,
        developmentPlans,
        activity,
        pendingGateSteps: planSteps
          .filter((step) => step.isManagerGate)
          .map((step) => ({
            userId: step.userId,
            title: step.title,
            planName: step.personName,
          })),
        pendingCertReviews: certReviewItems.map((item) => ({
          userId: item.userId,
          personName: item.personName,
          label: item.label,
        })),
      }),
    [
      org,
      plans,
      coachingByUser,
      approvedCertCountByUser,
      developmentPlans,
      activity,
      planSteps,
      certReviewItems,
    ],
  );

  const overdueStepIds = useMemo(
    () => [...new Set(view.milestonesOverdue.map((item) => item.assignmentStepId))],
    [view.milestonesOverdue],
  );

  useEffect(() => {
    if (overdueStepIds.length === 0) {
      setNudgeStatus({});
      return;
    }
    if (tab !== "cohort" && tab !== "milestones") return;

    const stepIds = overdueStepIds.join(",");
    let cancelled = false;

    fetch(`/api/manager/milestones/nudge?stepIds=${encodeURIComponent(stepIds)}`)
      .then((response) => (response.ok ? response.json() : { items: {} }))
      .then((data: { items?: Record<string, MilestoneNudgeStatus> }) => {
        if (!cancelled) setNudgeStatus(data.items ?? {});
      })
      .catch(() => {
        if (!cancelled) setNudgeStatus({});
      });

    return () => {
      cancelled = true;
    };
  }, [tab, overdueStepIds]);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setActionLoading((prev) => {
      if (loading) return { ...prev, [key]: true };
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleNudge = useCallback(
    async (item: MilestoneItemView) => {
      const key = `nudge:${item.assignmentStepId}`;
      const status = nudgeStatus[item.assignmentStepId];
      if (status && !status.canNudge) {
        toast.message(status.reason ?? "Nudge on cooldown");
        return;
      }

      setLoading(key, true);
      try {
        const response = await fetch("/api/manager/milestones/nudge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: item.userId,
            assignmentStepId: item.assignmentStepId,
            milestoneLabel: item.label,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          toast.error(data.error ?? "Could not send nudge");
          if (data.nextNudgeAt) {
            setNudgeStatus((prev) => ({
              ...prev,
              [item.assignmentStepId]: {
                canNudge: false,
                reason: data.error,
                nextNudgeAt: data.nextNudgeAt,
              },
            }));
          }
          return;
        }
        toast.success(`Nudge sent to ${item.se}`);
        setNudgeStatus((prev) => ({
          ...prev,
          [item.assignmentStepId]: {
            canNudge: false,
            reason: "On cooldown",
            nextNudgeAt: data.nextNudgeAt,
          },
        }));
      } catch {
        toast.error("Could not send nudge");
      } finally {
        setLoading(key, false);
      }
    },
    [nudgeStatus, setLoading],
  );

  const handleReschedule = useCallback(
    async (item: MilestoneItemView) => {
      const key = `reschedule:${item.assignmentStepId}`;
      setLoading(key, true);
      try {
        const response = await fetch("/api/manager/milestones/reschedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignmentId: item.assignmentId,
            assignmentStepId: item.assignmentStepId,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          toast.error(data.error ?? "Could not reschedule");
          return;
        }
        toast.success(rescheduleToastMessage(item, data), {
          action: {
            label: "Plan calendar",
            onClick: () => router.push(planCalendarHref(item.userId)),
          },
        });
        setDatePickerStepId(null);
        router.refresh();
      } catch {
        toast.error("Could not reschedule");
      } finally {
        setLoading(key, false);
      }
    },
    [router, setLoading],
  );

  const handleRescheduleToDate = useCallback(
    async (item: MilestoneItemView, newDueDate: string) => {
      const key = `reschedule-date:${item.assignmentStepId}`;
      setLoading(key, true);
      try {
        const response = await fetch("/api/manager/milestones/reschedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignmentId: item.assignmentId,
            assignmentStepId: item.assignmentStepId,
            newDueDate,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          toast.error(
            typeof data.error === "string" ? data.error : "Could not reschedule to that date",
          );
          return;
        }
        toast.success(rescheduleToastMessage(item, data), {
          action: {
            label: "Plan calendar",
            onClick: () => router.push(planCalendarHref(item.userId)),
          },
        });
        setDatePickerStepId(null);
        router.refresh();
      } catch {
        toast.error("Could not reschedule to that date");
      } finally {
        setLoading(key, false);
      }
    },
    [router, setLoading],
  );

  const handleMarkDone = useCallback(
    async (item: MilestoneItemView) => {
      const key = `complete:${item.assignmentStepId}`;
      setLoading(key, true);
      try {
        const response = await fetch("/api/manager/milestones/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentStepId: item.assignmentStepId }),
        });
        const data = await response.json();
        if (!response.ok) {
          toast.error(data.error ?? "Could not mark done");
          return;
        }
        toast.success(
          data.mode === "approved"
            ? `${item.label} approved`
            : `${item.label} marked complete`,
        );
        router.refresh();
      } catch {
        toast.error("Could not mark done");
      } finally {
        setLoading(key, false);
      }
    },
    [router, setLoading],
  );


  const closeDrawer = useCallback(() => setDrawerUserId(null), []);

  const drawerProfile = drawerUserId ? view.drawerProfiles[drawerUserId] ?? null : null;

  const nudgeLabel = (item: MilestoneItemView, idle: string) =>
    actionLoading[`nudge:${item.assignmentStepId}`]
      ? "Sending…"
      : nudgeStatus[item.assignmentStepId]?.canNudge === false
        ? "Nudged"
        : idle;

  const nudgeDisabled = (item: MilestoneItemView) =>
    Boolean(
      actionLoading[`nudge:${item.assignmentStepId}`] ||
        nudgeStatus[item.assignmentStepId]?.canNudge === false,
    );


  const milestoneCounts: Record<MilestoneFilter, number> = {
    all:
      view.milestonesOverdue.length +
      view.milestonesThisWeek.length +
      view.milestonesUpcoming.length +
      view.milestonesLater.length,
    overdue: view.milestonesOverdue.length,
    thisWeek: view.milestonesThisWeek.length,
    upcoming: view.milestonesUpcoming.length,
    later: view.milestonesLater.length,
  };
  const showBucket = (bucket: MilestoneBucket) => milestoneFilter === "all" || milestoneFilter === bucket;

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label-caps">{trackerCopy(view.cohortEyebrow)}</p>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedToggle
              label="Quarter"
              onChange={(id) => setQuarterIdx(Number(id))}
              options={QUARTERS.map((label, index) => ({ id: String(index), label }))}
              value={String(quarterIdx)}
            />
            <Link className="btn-secondary no-underline" href="/plans">
              Add program
            </Link>
          </div>
        </div>

        {/* Manager queue */}
        {view.managerQueue.length > 0 ? (
          <section aria-label="Waiting on you" className={LINE_CARD}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3">
              <h2 className="label-caps">Waiting on you</h2>
              <span className="text-[13px] text-muted">
                {view.managerQueue.length} {view.managerQueue.length === 1 ? "item needs" : "items need"} your action
              </span>
            </div>
            <ul>
              {view.managerQueue.map((item) => (
                <li
                  className="flex items-center justify-between gap-3 border-t border-divider px-5 py-3 first:border-t-0"
                  key={item.id}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <InitialsAvatar initials={item.seInitials} />
                    <span className="truncate text-[15px] text-ink">{trackerCopy(item.title)}</span>
                  </span>
                  <button className={PILL} onClick={() => router.push("/manager/inbox")} type="button">
                    {trackerCopy(item.actionLabel)}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Stats */}
        <StatStrip>
          <Stat label="Active programs" note="Across the cohort" value={view.stats.activePrograms} />
          <Stat label="On track" note={`${view.stats.onTrackPct}% of programs`} value={view.stats.onTrack} />
          <Stat
            label="At risk"
            note={view.stats.atRisk > 0 ? "Behind pace" : undefined}
            noteTone="danger"
            tone={view.stats.atRisk > 0 ? "danger" : "blue"}
            value={view.stats.atRisk}
          />
          <Stat
            label="Overdue items"
            note={view.stats.overdueItems > 0 ? "Need action now" : "Nothing overdue"}
            noteTone={view.stats.overdueItems > 0 ? "danger" : "muted"}
            tone={view.stats.overdueItems > 0 ? "danger" : "blue"}
            value={view.stats.overdueItems}
          />
          <Stat label="Avg completion" value={`${view.stats.avgCompletion}%`} />
          <Stat
            label="Cert gates cleared"
            note="This quarter"
            value={
              <>
                {view.stats.certGatesCleared}
                <span className="text-[22px] text-muted">/{view.stats.certGatesTotal}</span>
              </>
            }
          />
        </StatStrip>

        {/* View switcher */}
        <SegmentedToggle
          className="self-start"
          label="Program tracker view"
          onChange={(id) => setTab(id as ProgramTrackerTab)}
          options={TRACKER_TABS.map((mode) => ({
            id: mode.id,
            label: mode.id === "milestones" && view.overdueCount > 0 ? `${mode.label} (${view.overdueCount} overdue)` : mode.label,
          }))}
          value={tab}
        />

        {tab === "cohort" ? (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-ink">SE-I onboarding program</h2>
                  <p className="text-[13px] text-muted">Four phases over weeks 1 to 12</p>
                </div>
                <Link className="link text-sm" href="/plan-calendar">
                  View plan calendar
                </Link>
              </div>

              <TableCard minWidth={880}>
                <thead>
                  <tr>
                    <th className={thCls} scope="col">
                      SE
                    </th>
                    {PHASE_HEADERS.map(([phase, sub]) => (
                      <th className={thCls} key={phase} scope="col">
                        <span className="block">{phase}</span>
                        <span className="mt-0.5 block text-xs font-normal tracking-normal normal-case">{sub}</span>
                      </th>
                    ))}
                    <th className={cn(thCls, "text-right")} scope="col">
                      Overall
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.cohortRows.length === 0 ? (
                    <tr>
                      <td className={cn(tdCls, "py-8 text-center text-sm text-muted")} colSpan={6}>
                        No team members in scope.{" "}
                        <Link className="link" href="/plans">
                          Assign plans
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    view.cohortRows.map((row) => {
                      const blocked = row.phases.some((phase) => phase.status === "blocked");
                      const hasOverall = row.overall !== "—";
                      return (
                        <tr
                          className={cn("cursor-pointer", blocked ? rowHighlight.danger : "hover:bg-bg")}
                          key={row.userId}
                          onClick={() => setDrawerUserId(row.userId)}
                        >
                          <td className={tdCls}>
                            <button
                              aria-label={`Open ${row.name}'s programs`}
                              className="rounded-[8px] text-left"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDrawerUserId(row.userId);
                              }}
                              type="button"
                            >
                              <PersonCell initials={row.initials} name={row.name} subline={`${row.level}, day ${row.day}`} />
                            </button>
                          </td>
                          {row.phases.map((phase, index) => (
                            <td className={tdCls} key={index}>
                              <span className="flex flex-col gap-0.5">
                                <StatusPill tone={PHASE_TONE[phase.status] ?? "neutral"}>{phase.label}</StatusPill>
                                {phase.sub ? <span className="pl-[14px] text-[13px] text-muted">{phase.sub}</span> : null}
                              </span>
                            </td>
                          ))}
                          <td className={cn(tdCls, "text-right")}>
                            <span className="ml-auto flex w-[88px] flex-col items-end gap-1.5">
                              <span
                                className={cn(
                                  "num text-[20px] leading-none font-extrabold tracking-[-0.03em]",
                                  !hasOverall ? "text-muted" : blocked ? "text-danger" : "text-blue",
                                )}
                              >
                                {hasOverall ? row.overall : "None"}
                              </span>
                              <TrackerProgressBar className="w-full" danger={blocked} pct={hasOverall ? row.overallPct : 0} />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </TableCard>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className={LINE_CARD}>
                <div className="border-b border-line px-5 py-3">
                  <h2 className="label-caps">Phase definitions</h2>
                </div>
                <ul>
                  {PROGRAM_PHASE_DEFINITIONS.map((phase, index) => (
                    <li className="flex gap-3 border-t border-divider px-5 py-3 first:border-t-0" key={phase.name}>
                      <span
                        aria-hidden
                        className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-soft text-[13px] font-bold text-blue"
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-[15px] font-bold text-ink">{trackerCopy(phase.name)}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-muted">{trackerCopy(phase.desc)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={LINE_CARD}>
                <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-3">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="label-caps">Overdue milestones</h2>
                    <p className={cn("text-[13px] font-semibold", view.milestonesOverdue.length > 0 ? "text-danger" : "text-muted")}>
                      {view.milestonesOverdue.length === 1
                        ? "1 item needs action now"
                        : `${view.milestonesOverdue.length} items need action now`}
                    </p>
                  </div>
                  <button className="link text-sm" onClick={() => setTab("milestones")} type="button">
                    See all
                  </button>
                </div>
                {view.milestonesOverdue.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted">Nothing overdue.</p>
                ) : (
                  <ul>
                    {view.milestonesOverdue.slice(0, 6).map((item) => (
                      <li
                        className="flex items-center justify-between gap-3 border-t border-divider px-5 py-3 first:border-t-0"
                        key={item.id}
                      >
                        <TwoLineCell subline={`${item.se}, due ${formatMilestoneDate(item.isoDate)}`} title={item.label} />
                        <div className="flex shrink-0 items-center gap-3">
                          <StatusPill tone="danger">Overdue</StatusPill>
                          <button
                            className={PILL}
                            disabled={nudgeDisabled(item)}
                            onClick={() => handleNudge(item)}
                            title={nudgeStatus[item.assignmentStepId]?.reason}
                            type="button"
                          >
                            {nudgeLabel(item, "Nudge")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        ) : null}

        {tab === "programs" ? (
          <div className="flex flex-col gap-8">
            {view.sePrograms.length === 0 ? <p className="text-sm text-muted">No programs in scope.</p> : null}
            {view.sePrograms.map((se) => {
              const health = healthTag(se.healthLabel);
              return (
                <section className="flex flex-col gap-3" key={se.userId}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <button
                      aria-label={`Open ${se.name}'s programs`}
                      className="rounded-[8px] text-left"
                      onClick={() => setDrawerUserId(se.userId)}
                      type="button"
                    >
                      <PersonCell initials={se.initials} name={se.name} subline={`${se.level}, day ${se.day}`} />
                    </button>
                    <StatusPill tone={health.tone}>{health.text}</StatusPill>
                    <span className="ml-auto text-[13px] text-muted">
                      {se.programCount} active program{se.programCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {se.programs.map((program) => {
                      const status = programStatusTag(program.status);
                      const bad = program.status === "Critical";
                      return (
                        <div
                          className={cn(
                            "flex flex-col gap-2 rounded-[14px] border border-line bg-white px-5 py-4",
                            bad && "shadow-[inset_3px_0_0_var(--color-danger)]",
                          )}
                          key={program.id}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Tag tone="blue">{program.type}</Tag>
                            <StatusPill tone={status.tone}>{program.status}</StatusPill>
                          </div>
                          <div>
                            <p className="text-[15px] leading-snug font-bold text-ink">{program.name}</p>
                            <p className="text-[13px] text-muted">{program.subtitle}</p>
                          </div>
                          <div className="mt-auto flex flex-col gap-1.5 pt-1">
                            <div className="flex items-baseline justify-between text-[13px]">
                              <span className="text-muted">Progress</span>
                              <span className={cn("num font-bold", bad ? "text-danger" : "text-blue")}>{program.pct}%</span>
                            </div>
                            <TrackerProgressBar danger={bad} label={`${program.pct}% complete`} pct={program.pct} />
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className="text-[13px] text-muted">
                                {program.due && program.due !== "—" ? `Due ${program.due}` : "No due date"}
                              </span>
                              <Link className="link text-sm" href={`/manager/team?profile=${se.userId}`}>
                                Open
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : null}

        {tab === "milestones" ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-6">
              <FilterBar
                show={(
                  [
                    ["all", "All"],
                    ["overdue", "Overdue"],
                    ["thisWeek", "This week"],
                    ["upcoming", "Next 2 weeks"],
                    ["later", "Later"],
                  ] as const
                ).map(([id, label]) => (
                  <Chip
                    active={milestoneFilter === id}
                    count={milestoneCounts[id]}
                    key={id}
                    onClick={() => setMilestoneFilter(id)}
                  >
                    {label}
                  </Chip>
                ))}
              />
              {showBucket("overdue") ? (
                <MilestoneSection
                  actionLoading={actionLoading}
                  actions="overdue"
                  datePickerStepId={datePickerStepId}
                  items={view.milestonesOverdue}
                  label="Overdue"
                  nudgeStatus={nudgeStatus}
                  onMarkDone={handleMarkDone}
                  onNudge={handleNudge}
                  onReschedule={handleReschedule}
                  onRescheduleToDate={handleRescheduleToDate}
                  setDatePickerStepId={setDatePickerStepId}
                />
              ) : null}
              {showBucket("thisWeek") ? (
                <MilestoneSection actions="thisWeek" items={view.milestonesThisWeek} label="Due this week" />
              ) : null}
              {showBucket("upcoming") ? (
                <MilestoneSection actions="upcoming" items={view.milestonesUpcoming} label="Due in the next 2 weeks" />
              ) : null}
              {showBucket("later") ? <MilestoneSection actions="later" items={view.milestonesLater} label="Later" /> : null}
              {milestoneCounts[milestoneFilter] === 0 ? (
                <p className="text-sm text-muted">
                  {milestoneFilter === "all" ? "No open milestones on the horizon." : "No milestones in this view."}
                </p>
              ) : null}
              <p className="text-[13px] text-muted">
                Rescheduled milestones stay here by due date. See the full timeline on the{" "}
                <Link className="link" href="/plan-calendar">
                  plan calendar
                </Link>
                .
              </p>
            </div>

            <aside className={cn(LINE_CARD, "lg:sticky lg:top-4")}>
              <div className="border-b border-line px-5 py-4">
                <h2 className="label-caps">Manager sign-off queue</h2>
                <p className="mt-1 text-xl font-extrabold text-ink">
                  {view.signOffItems.length} item{view.signOffItems.length === 1 ? "" : "s"} waiting
                </p>
              </div>
              {view.signOffItems.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">No pending sign-offs.</p>
              ) : (
                <ul>
                  {view.signOffItems.map((item) => (
                    <li className="flex flex-col gap-2 border-t border-divider px-5 py-3 first:border-t-0" key={item.id}>
                      <span className="flex items-center gap-3">
                        <InitialsAvatar initials={item.seInitials} />
                        <span className="text-sm font-bold text-ink">{trackerCopy(item.title)}</span>
                      </span>
                      <p className="text-[13px] leading-snug text-muted">{item.description}</p>
                      <div className="flex gap-2">
                        <button className={PILL} onClick={() => router.push("/manager/inbox")} type="button">
                          Approve
                        </button>
                        <button className={PILL} onClick={() => router.push("/manager/inbox")} type="button">
                          Review
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        ) : null}
      </div>

      <ProgramTrackerSeDrawer onClose={closeDrawer} profile={drawerProfile} />
    </>
  );
}

function MilestoneDatePickerRow({
  item,
  open,
  saving,
  onCancel,
  onApply,
}: {
  item: MilestoneItemView;
  open: boolean;
  saving: boolean;
  onCancel: () => void;
  onApply: (date: string) => void;
}) {
  const [pickedDate, setPickedDate] = useState(() => addCalendarDays(todayIso(), 14));
  const inputId = useId();

  useEffect(() => {
    if (open) {
      setPickedDate(addCalendarDays(todayIso(), 14));
    }
  }, [open, item.assignmentStepId]);

  if (!open) return null;

  return (
    <tr>
      <td className={cn(tdCls, "bg-bg")} colSpan={4}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[13px] text-muted" htmlFor={inputId}>
              Was {formatMilestoneDate(item.isoDate)}. New due date
            </label>
            <input
              className="w-[11rem] rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] text-ink"
              id={inputId}
              min={todayIso()}
              onChange={(event) => setPickedDate(event.target.value)}
              type="date"
              value={pickedDate}
            />
          </div>
          <button className={PILL} disabled={!pickedDate || saving} onClick={() => onApply(pickedDate)} type="button">
            {saving ? "Saving…" : "Apply"}
          </button>
          <button className="link text-sm" disabled={saving} onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

const SECTION_DATE: Record<MilestoneBucket, string> = {
  overdue: "text-danger",
  thisWeek: "text-warning",
  upcoming: "text-ink",
  later: "text-muted",
};

/** "in 3d" from the view model, as words. */
function daysAwayCopy(value: string) {
  const match = /^in (\d+)d$/.exec(value);
  if (!match) return value;
  const days = Number(match[1]);
  return days === 1 ? "In 1 day" : `In ${days} days`;
}

function MilestoneSection({
  label,
  items,
  actions,
  nudgeStatus = {},
  actionLoading = {},
  datePickerStepId = null,
  setDatePickerStepId,
  onNudge,
  onReschedule,
  onRescheduleToDate,
  onMarkDone,
}: {
  label: string;
  items: MilestoneItemView[];
  actions: MilestoneBucket;
  nudgeStatus?: Record<string, MilestoneNudgeStatus>;
  actionLoading?: Record<string, boolean>;
  datePickerStepId?: string | null;
  setDatePickerStepId?: (stepId: string | null) => void;
  onNudge?: (item: MilestoneItemView) => void;
  onReschedule?: (item: MilestoneItemView) => void;
  onRescheduleToDate?: (item: MilestoneItemView, newDueDate: string) => void;
  onMarkDone?: (item: MilestoneItemView) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="flex items-baseline gap-2">
        <span className="label-caps">{label}</span>
        <span className="num text-[13px] text-muted">{items.length}</span>
      </h2>
      <TableCard minWidth={actions === "overdue" ? 860 : 680}>
        <thead>
          <tr>
            <th className={cn(thCls, "w-[130px]")} scope="col">
              Due
            </th>
            <th className={thCls} scope="col">
              SE
            </th>
            <th className={thCls} scope="col">
              Milestone
            </th>
            <th className={cn(thCls, "text-right")} scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <MilestoneRows
              actionLoading={actionLoading}
              actions={actions}
              datePickerStepId={datePickerStepId}
              item={item}
              key={item.id}
              nudgeStatus={nudgeStatus}
              onMarkDone={onMarkDone}
              onNudge={onNudge}
              onReschedule={onReschedule}
              onRescheduleToDate={onRescheduleToDate}
              setDatePickerStepId={setDatePickerStepId}
            />
          ))}
        </tbody>
      </TableCard>
    </section>
  );
}

function MilestoneRows({
  item,
  actions,
  nudgeStatus,
  actionLoading,
  datePickerStepId,
  setDatePickerStepId,
  onNudge,
  onReschedule,
  onRescheduleToDate,
  onMarkDone,
}: {
  item: MilestoneItemView;
  actions: MilestoneBucket;
  nudgeStatus: Record<string, MilestoneNudgeStatus>;
  actionLoading: Record<string, boolean>;
  datePickerStepId: string | null;
  setDatePickerStepId?: (stepId: string | null) => void;
  onNudge?: (item: MilestoneItemView) => void;
  onReschedule?: (item: MilestoneItemView) => void;
  onRescheduleToDate?: (item: MilestoneItemView, newDueDate: string) => void;
  onMarkDone?: (item: MilestoneItemView) => void;
}) {
  const stepId = item.assignmentStepId;
  return (
    <>
      <tr className={actions === "overdue" ? rowHighlight.danger : undefined}>
        <td className={cn(tdCls, "text-sm font-semibold whitespace-nowrap", SECTION_DATE[actions])}>
          {formatMilestoneDate(item.isoDate)}
        </td>
        <td className={tdCls}>
          <PersonCell initials={item.initials} name={item.se} />
        </td>
        <td className={tdCls}>
          <TwoLineCell subline={trackerCopy(item.program)} title={item.label} />
        </td>
        <td className={cn(tdCls, "text-right")}>
          {actions === "overdue" ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                className={PILL}
                disabled={actionLoading[`nudge:${stepId}`] || nudgeStatus[stepId]?.canNudge === false}
                onClick={() => onNudge?.(item)}
                title={nudgeStatus[stepId]?.reason}
                type="button"
              >
                {actionLoading[`nudge:${stepId}`]
                  ? "Sending…"
                  : nudgeStatus[stepId]?.canNudge === false
                    ? "Nudged"
                    : "Nudge SE"}
              </button>
              <button
                className={PILL}
                disabled={actionLoading[`reschedule:${stepId}`]}
                onClick={() => onReschedule?.(item)}
                title="Move the due date 7 days later"
                type="button"
              >
                {actionLoading[`reschedule:${stepId}`] ? "Saving…" : "Add 7 days"}
              </button>
              <button
                aria-expanded={datePickerStepId === stepId}
                className={PILL}
                disabled={actionLoading[`reschedule-date:${stepId}`]}
                onClick={() => setDatePickerStepId?.(datePickerStepId === stepId ? null : stepId)}
                title="Choose a specific due date"
                type="button"
              >
                {datePickerStepId === stepId ? "Close" : "Pick date"}
              </button>
              <button
                className={PILL}
                disabled={actionLoading[`complete:${stepId}`]}
                onClick={() => onMarkDone?.(item)}
                type="button"
              >
                {actionLoading[`complete:${stepId}`] ? "Saving…" : "Mark done"}
              </button>
            </div>
          ) : null}
          {actions === "thisWeek" ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button className={PILL} type="button">
                Remind SE
              </button>
              <Link className="link text-sm" href={`/manager/team?profile=${item.userId}`}>
                View step
              </Link>
              <Link className="link text-sm" href={planCalendarHref(item.userId)}>
                Calendar
              </Link>
            </div>
          ) : null}
          {actions === "upcoming" || actions === "later" ? (
            <div className="flex items-center justify-end gap-3">
              {item.daysAway ? <span className="text-[13px] text-muted">{daysAwayCopy(item.daysAway)}</span> : null}
              <Link className="link text-sm" href={planCalendarHref(item.userId)}>
                Calendar
              </Link>
            </div>
          ) : null}
        </td>
      </tr>
      <MilestoneDatePickerRow
        item={item}
        onApply={(date) => onRescheduleToDate?.(item, date)}
        onCancel={() => setDatePickerStepId?.(null)}
        open={datePickerStepId === stepId}
        saving={Boolean(actionLoading[`reschedule-date:${stepId}`])}
      />
    </>
  );
}
