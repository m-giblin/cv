"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  healthTag,
  InitialsAvatar,
  ProgramTrackerSeDrawer,
  programStatusTag,
} from "@/components/manager/program-tracker-se-drawer";
import type { CertReviewItem } from "@/components/manager/cert-review-item";
import type { PlanStepReviewItem } from "@/components/manager/plan-step-review-panel";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Stat } from "@/components/ui/stat";
import { Tag } from "@/components/ui/tag";
import type { MilestoneNudgeStatus } from "@/lib/manager/milestone-actions";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { addCalendarDays } from "@/lib/plans/business-days";
import {
  buildProgramTrackerView,
  classifyMilestoneDueDate,
  MILESTONE_BUCKET_LABELS,
  PROGRAM_PHASE_DEFINITIONS,
  type MilestoneItemView,
  type ProgramTrackerTab,
} from "@/lib/plans/program-tracker-view";
import type { ActivityLog, DevelopmentPlan, Profile, UserPlan } from "@/lib/types";

function formatMilestoneDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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

function rescheduleToastMessage(item: MilestoneItemView, data: RescheduleResult): string {
  const from = formatMilestoneDate(data.previousDueDate);
  const to = formatMilestoneDate(data.newDueDate);
  const bucket = classifyMilestoneDueDate(data.newDueDate);
  const where = MILESTONE_BUCKET_LABELS[bucket];
  if (data.mode === "custom") {
    return `${item.label}: ${from} → ${to}. Now in ${where}.`;
  }
  const anchorNote =
    data.anchoredFrom === data.previousDueDate
      ? `+${data.shiftDays} days`
      : `+${data.shiftDays} days from today`;
  return `${item.label}: ${from} → ${to} (${anchorNote}). Now in ${where}.`;
}

function planCalendarHref(userId: string): string {
  return `/plan-calendar?se=${encodeURIComponent(userId)}`;
}

/** Small pill action used inside rows (btn-secondary is too large for dense lists). */
const PILL =
  "inline-flex items-center rounded-full border-[1.5px] border-ink bg-white px-3 py-1 text-xs font-bold text-ink no-underline hover:bg-blue-soft disabled:cursor-not-allowed disabled:border-line-strong disabled:text-muted disabled:hover:bg-white";

const LINE_CARD = "overflow-hidden rounded-[14px] border border-line bg-white";

const QUARTERS = ["Q3 FY2026", "Q2 FY2026", "All"];

const TRACKER_TABS: ProgramTrackerTab[] = ["cohort", "programs", "milestones"];

const PHASE_HEADERS = [
  ["Phase 1", "Foundations · wks 1–2"],
  ["Phase 2", "Technical depth · wks 3–4"],
  ["Phase 3", "Field application · wks 5–6"],
  ["Phase 4", "Cert gates · ongoing"],
] as const;

const PHASE_CELL: Record<string, { cls: string; symbol: string }> = {
  complete: { cls: "bg-success-soft text-success", symbol: "✓" },
  active: { cls: "bg-blue-soft text-blue", symbol: "●" },
  blocked: { cls: "bg-danger-soft text-danger", symbol: "▲" },
  upcoming: { cls: "bg-white text-muted", symbol: "•" },
};

const COHORT_GRID = "grid grid-cols-[200px_repeat(4,minmax(0,1fr))_110px]";

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
            label: "Plan Calendar",
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
            label: "Plan Calendar",
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

  return (
    <>
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label-mono">{view.cohortEyebrow}</p>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedToggle
              label="Quarter"
              onChange={(id) => setQuarterIdx(Number(id))}
              options={QUARTERS.map((label, index) => ({ id: String(index), label }))}
              value={String(quarterIdx)}
            />
            <Link className="btn-secondary no-underline" href="/plans">
              + Add program
            </Link>
          </div>
        </div>

        {/* Manager queue */}
        {view.managerQueue.length > 0 ? (
          <section
            aria-label="Manager queue"
            className="rounded-[14px] border-[1.5px] border-ink bg-signal-soft px-5 py-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="label-mono text-ink">Manager queue</p>
              <span className="font-mono text-xs text-muted">
                {view.managerQueue.length} pending your action
              </span>
            </div>
            <ul className="flex flex-wrap gap-2.5">
              {view.managerQueue.map((item) => (
                <li
                  className="flex items-center gap-3 rounded-full border border-line bg-white py-1 pl-4 pr-1"
                  key={item.id}
                >
                  <span className="text-sm text-ink">{item.title}</span>
                  <button
                    className={PILL}
                    onClick={() => router.push("/manager/inbox")}
                    type="button"
                  >
                    {item.actionLabel}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Stats */}
        <section aria-label="Program stats" className={LINE_CARD}>
          <div className="-mb-px -mr-px grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <StatCell>
              <Stat label="Active programs" value={view.stats.activePrograms} />
              <p className="mt-1 text-xs text-muted">Across cohort</p>
            </StatCell>
            <StatCell>
              <Stat label="On track" value={view.stats.onTrack} />
              <p className="mt-1 text-xs text-muted">{view.stats.onTrackPct}% of programs</p>
            </StatCell>
            <StatCell>
              <Stat
                label="At risk"
                tone={view.stats.atRisk > 0 ? "danger" : "blue"}
                value={view.stats.atRisk}
              />
              <p className="mt-1 text-xs text-muted">Behind pace</p>
            </StatCell>
            <StatCell>
              <Stat
                label="Overdue items"
                note={view.stats.overdueItems > 0 ? "Need action now" : undefined}
                tone={view.stats.overdueItems > 0 ? "danger" : "blue"}
                value={view.stats.overdueItems}
              />
              {view.stats.overdueItems > 0 ? null : (
                <p className="mt-1 text-xs text-muted">Nothing overdue</p>
              )}
            </StatCell>
            <StatCell>
              <Stat label="Avg completion" value={`${view.stats.avgCompletion}%`} />
              <ProgressBar className="mt-2" pct={view.stats.avgCompletion} />
            </StatCell>
            <StatCell>
              <Stat
                label="Cert gates cleared"
                value={
                  <>
                    {view.stats.certGatesCleared}
                    <span className="text-[22px] text-faint">/{view.stats.certGatesTotal}</span>
                  </>
                }
              />
              <p className="mt-1 text-xs text-muted">This quarter</p>
            </StatCell>
          </div>
        </section>

        {/* View switcher */}
        <SegmentedToggle
          label="Program tracker view"
          onChange={(id) => setTab(id as ProgramTrackerTab)}
          options={TRACKER_TABS.map((mode) => ({
            id: mode,
            label:
              mode === "milestones" && view.overdueCount > 0
                ? `Milestones · ${view.overdueCount}`
                : mode,
          }))}
          value={tab}
        />

        {tab === "cohort" ? (
          <div className="space-y-6">
            <section className={LINE_CARD}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-4">
                <div>
                  <h2 className="text-lg font-extrabold text-ink">SE-I onboarding program</h2>
                  <p className="label-mono mt-0.5">4-phase · weeks 1–12</p>
                </div>
                <Link className="link text-sm" href="/plan-calendar">
                  View plan calendar
                </Link>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className={`${COHORT_GRID} bg-blue font-mono text-xs uppercase text-white`}>
                    <div className="px-5 py-[11px]">SE</div>
                    {PHASE_HEADERS.map(([phase, sub]) => (
                      <div className="px-3 py-[11px]" key={phase}>
                        <div>{phase}</div>
                        <div className="mt-0.5 normal-case text-on-blue-muted">{sub}</div>
                      </div>
                    ))}
                    <div className="px-3 py-[11px] text-center">Overall</div>
                  </div>

                  {view.cohortRows.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted">
                      No team members in scope.{" "}
                      <Link className="link" href="/plans">
                        Assign plans
                      </Link>
                    </p>
                  ) : (
                    view.cohortRows.map((row) => {
                      const blocked = row.phases.some((phase) => phase.status === "blocked");
                      const hasOverall = row.overall !== "—";
                      return (
                        <button
                          aria-label={`Open ${row.name}'s programs`}
                          className={`${COHORT_GRID} w-full border-b border-divider text-left last:border-b-0 hover:bg-bg`}
                          key={row.userId}
                          onClick={() => setDrawerUserId(row.userId)}
                          type="button"
                        >
                          <div className="flex items-center gap-2.5 px-5 py-3">
                            <InitialsAvatar initials={row.initials} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-ink">{row.name}</div>
                              <div className="font-mono text-xs text-muted">
                                {row.level} · Day {row.day}
                              </div>
                            </div>
                          </div>
                          {row.phases.map((phase, index) => {
                            const cell = PHASE_CELL[phase.status] ?? PHASE_CELL.upcoming!;
                            return (
                              <div
                                className={`flex flex-col justify-center gap-0.5 border-l border-divider px-3 py-3 ${cell.cls}`}
                                key={index}
                              >
                                <span className="text-sm font-bold">
                                  <span aria-hidden>{cell.symbol}</span> {phase.label}
                                </span>
                                {phase.sub ? <span className="text-xs text-muted">{phase.sub}</span> : null}
                              </div>
                            );
                          })}
                          <div className="flex flex-col items-center justify-center gap-1.5 border-l border-divider px-3 py-3">
                            <span
                              className={`text-[22px] font-extrabold leading-none tracking-[-0.03em] ${
                                !hasOverall ? "text-faint" : blocked ? "text-danger" : "text-blue"
                              }`}
                            >
                              {row.overall}
                            </span>
                            <ProgressBar
                              className="w-16"
                              danger={blocked}
                              pct={hasOverall ? row.overallPct : 0}
                            />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className={LINE_CARD}>
                <div className="border-b border-divider px-5 py-4">
                  <h2 className="text-lg font-extrabold text-ink">Phase definitions</h2>
                </div>
                <ul>
                  {PROGRAM_PHASE_DEFINITIONS.map((phase, index) => (
                    <li className="flex gap-3 border-b border-divider px-5 py-3 last:border-b-0" key={phase.name}>
                      <span
                        aria-hidden
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-soft font-mono text-xs font-medium text-blue"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink">{phase.name}</p>
                        <p className="mt-0.5 text-xs leading-snug text-muted">{phase.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={LINE_CARD}>
                <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-ink">Overdue milestones</h2>
                    <p className="mt-0.5 text-sm text-danger">
                      {view.milestonesOverdue.length} items need action now
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
                        className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-b-0"
                        key={item.id}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-12 shrink-0 font-mono text-xs font-medium text-danger">
                            {item.dateShort}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink">{item.label}</p>
                            <p className="truncate text-xs text-muted">{item.program}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Tag tone="danger">▲ Overdue</Tag>
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
          <div className="space-y-8">
            {view.sePrograms.length === 0 ? (
              <p className="text-sm text-muted">No programs in scope.</p>
            ) : null}
            {view.sePrograms.map((se) => {
              const health = healthTag(se.healthLabel);
              return (
                <section key={se.userId}>
                  <button
                    className="mb-3 flex w-full flex-wrap items-center gap-3 rounded-[10px] text-left"
                    onClick={() => setDrawerUserId(se.userId)}
                    type="button"
                  >
                    <InitialsAvatar initials={se.initials} size={32} />
                    <span className="text-lg font-extrabold text-ink">{se.name}</span>
                    <span className="font-mono text-xs text-muted">
                      {se.level} · Day {se.day}
                    </span>
                    <Tag tone={health.tone}>
                      {health.symbol} {health.text}
                    </Tag>
                    <span className="ml-auto text-xs text-muted">
                      {se.programCount} active program{se.programCount === 1 ? "" : "s"}
                    </span>
                  </button>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {se.programs.map((program) => {
                      const status = programStatusTag(program.status);
                      const bad = program.status === "Critical";
                      return (
                        <div
                          className={`flex flex-col rounded-[14px] border bg-white px-5 py-4 ${
                            bad ? "border-danger" : "border-line"
                          }`}
                          key={program.id}
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <span className="label-mono">{program.type}</span>
                            <Tag tone={status.tone}>
                              {status.symbol} {program.status}
                            </Tag>
                          </div>
                          <p className="mb-1 text-sm font-bold leading-snug text-ink">{program.name}</p>
                          <p className="mb-3 text-xs text-muted">{program.subtitle}</p>
                          <div className="mt-auto">
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="text-muted">Progress</span>
                              <span className={`font-mono font-medium ${bad ? "text-danger" : "text-blue"}`}>
                                {program.pct}%
                              </span>
                            </div>
                            <ProgressBar className="mb-3" danger={bad} pct={program.pct} />
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs text-muted">Due {program.due}</span>
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
            <div className="space-y-6">
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
              <MilestoneSection actions="thisWeek" items={view.milestonesThisWeek} label="Due this week" />
              <MilestoneSection
                actions="upcoming"
                items={view.milestonesUpcoming}
                label="Upcoming · next 2 weeks"
              />
              <MilestoneSection actions="later" items={view.milestonesLater} label="Later" />
              {view.milestonesOverdue.length === 0 &&
              view.milestonesThisWeek.length === 0 &&
              view.milestonesUpcoming.length === 0 &&
              view.milestonesLater.length === 0 ? (
                <p className="text-sm text-muted">No open milestones on the horizon.</p>
              ) : null}
              <p className="text-xs text-muted">
                Rescheduled milestones stay here by due date, or view the full timeline on{" "}
                <Link className="link" href="/plan-calendar">
                  Plan Calendar
                </Link>
                .
              </p>
            </div>

            <aside className={`${LINE_CARD} lg:sticky lg:top-4`}>
              <div className="border-b border-divider px-5 py-4">
                <p className="label-mono">Manager sign-off queue</p>
                <h2 className="mt-0.5 text-lg font-extrabold text-ink">
                  {view.signOffItems.length} item{view.signOffItems.length === 1 ? "" : "s"} waiting
                </h2>
              </div>
              {view.signOffItems.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">No pending sign-offs.</p>
              ) : (
                <ul>
                  {view.signOffItems.map((item) => (
                    <li className="border-b border-divider px-5 py-3 last:border-b-0" key={item.id}>
                      <div className="mb-1.5 flex items-center gap-2.5">
                        <InitialsAvatar initials={item.seInitials} />
                        <span className="text-sm font-bold text-ink">{item.title}</span>
                      </div>
                      <p className="mb-2.5 text-xs leading-snug text-muted">{item.description}</p>
                      <div className="flex gap-2">
                        <button className={PILL} onClick={() => router.push("/manager/inbox")} type="button">
                          Approve ✓
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

function StatCell({ children }: { children: ReactNode }) {
  return <div className="border-b border-r border-divider px-5 py-4">{children}</div>;
}

function ProgressBar({
  pct,
  danger = false,
  className = "",
}: {
  pct: number;
  danger?: boolean;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div aria-hidden className={`h-2 overflow-hidden rounded-full bg-divider ${className}`}>
      <div className={`h-full rounded-full ${danger ? "bg-danger" : "bg-blue"}`} style={{ width: `${width}%` }} />
    </div>
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
    <div className="flex flex-wrap items-end gap-3 border-t border-divider bg-bg px-5 py-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted" htmlFor={inputId}>
          Was {formatMilestoneDate(item.isoDate)}. New due date
        </label>
        <input
          className="h-9 w-[11rem] rounded-[10px] border border-line-strong bg-white px-3 text-sm text-ink"
          id={inputId}
          min={todayIso()}
          onChange={(event) => setPickedDate(event.target.value)}
          type="date"
          value={pickedDate}
        />
      </div>
      <button
        className={PILL}
        disabled={!pickedDate || saving}
        onClick={() => onApply(pickedDate)}
        type="button"
      >
        {saving ? "Saving…" : "Apply"}
      </button>
      <button className="link text-sm" disabled={saving} onClick={onCancel} type="button">
        Cancel
      </button>
    </div>
  );
}

const SECTION_STYLE: Record<
  "overdue" | "thisWeek" | "upcoming" | "later",
  { symbol: string; text: string; date: string }
> = {
  overdue: { symbol: "▲", text: "text-danger", date: "text-danger" },
  thisWeek: { symbol: "●", text: "text-warning", date: "text-warning" },
  upcoming: { symbol: "•", text: "text-muted", date: "text-ink" },
  later: { symbol: "•", text: "text-muted", date: "text-muted" },
};

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
  actions: "overdue" | "thisWeek" | "upcoming" | "later";
  nudgeStatus?: Record<string, MilestoneNudgeStatus>;
  actionLoading?: Record<string, boolean>;
  datePickerStepId?: string | null;
  setDatePickerStepId?: (stepId: string | null) => void;
  onNudge?: (item: MilestoneItemView) => void;
  onReschedule?: (item: MilestoneItemView) => void;
  onRescheduleToDate?: (item: MilestoneItemView, newDueDate: string) => void;
  onMarkDone?: (item: MilestoneItemView) => void;
}) {
  const style = SECTION_STYLE[actions];

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className={`mb-2 font-mono text-xs font-medium uppercase tracking-[0.03em] ${style.text}`}>
        <span aria-hidden>{style.symbol}</span> {label} · {items.length} items
      </h2>
      <ul
        className={`overflow-hidden rounded-[14px] border bg-white ${
          actions === "overdue" ? "border-danger" : "border-line"
        }`}
      >
        {items.map((item) => (
          <li className="border-b border-divider last:border-b-0" key={item.id}>
            <div className="flex flex-wrap items-center gap-4 px-5 py-3">
              <div className={`w-12 shrink-0 text-center font-mono text-xs ${style.date}`}>
                <div className="font-medium">{item.dateShort}</div>
                <div>{item.dayOfWeek}</div>
              </div>
              <InitialsAvatar initials={item.initials} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-muted">{item.se}</p>
                <p className="text-sm font-bold text-ink">{item.label}</p>
                <p className="font-mono text-xs text-muted">{item.program}</p>
              </div>
              {actions === "overdue" ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    className={PILL}
                    disabled={
                      actionLoading[`nudge:${item.assignmentStepId}`] ||
                      nudgeStatus[item.assignmentStepId]?.canNudge === false
                    }
                    onClick={() => onNudge?.(item)}
                    title={nudgeStatus[item.assignmentStepId]?.reason}
                    type="button"
                  >
                    {actionLoading[`nudge:${item.assignmentStepId}`]
                      ? "Sending…"
                      : nudgeStatus[item.assignmentStepId]?.canNudge === false
                        ? "Nudged"
                        : "Nudge SE"}
                  </button>
                  <button
                    className={PILL}
                    disabled={actionLoading[`reschedule:${item.assignmentStepId}`]}
                    onClick={() => onReschedule?.(item)}
                    title="Move due date forward 7 days from today"
                    type="button"
                  >
                    {actionLoading[`reschedule:${item.assignmentStepId}`] ? "Saving…" : "+7 days"}
                  </button>
                  <button
                    aria-expanded={datePickerStepId === item.assignmentStepId}
                    className={PILL}
                    disabled={actionLoading[`reschedule-date:${item.assignmentStepId}`]}
                    onClick={() =>
                      setDatePickerStepId?.(
                        datePickerStepId === item.assignmentStepId ? null : item.assignmentStepId,
                      )
                    }
                    title="Choose a specific due date"
                    type="button"
                  >
                    {datePickerStepId === item.assignmentStepId ? "Close" : "Pick date"}
                  </button>
                  <button
                    className={PILL}
                    disabled={actionLoading[`complete:${item.assignmentStepId}`]}
                    onClick={() => onMarkDone?.(item)}
                    type="button"
                  >
                    {actionLoading[`complete:${item.assignmentStepId}`] ? "Saving…" : "Mark done"}
                  </button>
                </div>
              ) : null}
              {actions === "thisWeek" ? (
                <div className="flex shrink-0 flex-wrap items-center gap-3">
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
                <div className="flex shrink-0 items-center gap-3">
                  {item.daysAway ? (
                    <span className="font-mono text-xs text-muted">{item.daysAway}</span>
                  ) : null}
                  <Link className="link text-sm" href={planCalendarHref(item.userId)}>
                    Calendar
                  </Link>
                </div>
              ) : null}
            </div>
            <MilestoneDatePickerRow
              item={item}
              onApply={(date) => onRescheduleToDate?.(item, date)}
              onCancel={() => setDatePickerStepId?.(null)}
              open={datePickerStepId === item.assignmentStepId}
              saving={Boolean(actionLoading[`reschedule-date:${item.assignmentStepId}`])}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
