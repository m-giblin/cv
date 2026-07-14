"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProgramTrackerSeDrawer } from "@/components/manager/program-tracker-se-drawer";
import type { CertReviewItem } from "@/components/manager/cert-review-item";
import type { PlanStepReviewItem } from "@/components/manager/plan-step-review-panel";
import { Input } from "@/components/ui/input";
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

function Avatar({
  initials: label,
  bg,
  size = 28,
  fontSize = 9.5,
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

  const drawerProfile = drawerUserId ? view.drawerProfiles[drawerUserId] ?? null : null;

  return (
    <>
      <div className="flex min-h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-sm border border-[#E2DFD9] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        {/* Topbar */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#E2DFD9] px-5">
          <div className="flex items-center">
            <span className="font-mono text-[10.5px] text-[#A09D98]">Program</span>
            <span className="mx-0.5 text-[11px] text-[#C4C1BB]">›</span>
            <span className="font-mono text-[10.5px] font-medium text-[#3D3C38]">Program Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex items-center border border-[#D4D1CB] px-2.5 py-1 text-[10px] font-semibold text-[#3D3C38] hover:border-[#0071CE] hover:text-[#0071CE]"
              href="/plans"
            >
              + Add program
            </Link>
          </div>
        </div>

        {/* Manager queue strip */}
        {view.managerQueue.length > 0 ? (
          <div className="flex shrink-0 items-center gap-4 bg-[#00143A] px-5 py-2">
            <div className="h-1.5 w-1.5 shrink-0 animate-[alertPulse_2.8s_ease-in-out_infinite] rounded-full bg-[#D4810A]" />
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/50">
              Manager queue
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              {view.managerQueue.map((item) => (
                <div
                  className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1"
                  key={item.id}
                >
                  <span className="text-[11px] text-white/75">{item.title}</span>
                  <button
                    className="px-2 py-0.5 text-[9px] font-semibold text-white"
                    onClick={() => {
                      if (item.actionStyle === "amber") {
                        router.push("/manager?section=inbox");
                      } else {
                        router.push("/manager?section=inbox");
                      }
                    }}
                    style={{
                      background: item.actionStyle === "amber" ? "#D4810A" : "rgba(0,113,206,.6)",
                    }}
                    type="button"
                  >
                    {item.actionLabel}
                  </button>
                </div>
              ))}
            </div>
            <span className="font-mono text-[9px] text-white/30">
              {view.managerQueue.length} pending your action
            </span>
          </div>
        ) : null}

        {/* Page header + stats + tabs */}
        <div className="shrink-0 border-b border-[#E2DFD9] bg-white px-5 pb-0 pt-4">
          <div className="mb-3.5 flex items-start justify-between">
            <div>
              <p className="mb-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#A09D98]">
                {view.cohortEyebrow}
              </p>
              <h2 className="font-display text-2xl font-extrabold leading-none tracking-[-0.025em] text-[#0D0E12]">
                Program Tracker
              </h2>
              <p className="mt-1 text-[11.5px] text-[#7A7772]">
                All structured programs — onboarding, certifications, specialization tracks, dev plans
              </p>
            </div>
            <div className="flex overflow-hidden border border-[#D4D1CB]">
              {["Q3 FY2026", "Q2 FY2026", "All"].map((label, index) => (
                <button
                  className={`px-2.5 py-1 font-mono text-[8.5px] ${
                    quarterIdx === index ? "bg-[#00143A] text-white" : "bg-white text-[#7A7772]"
                  } ${index > 0 ? "border-l border-[#D4D1CB]" : ""}`}
                  key={label}
                  onClick={() => setQuarterIdx(index)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="-mx-5 grid grid-cols-2 border-t border-[#E2DFD9] lg:grid-cols-6">
            <StatCell label="Active programs" sub="across cohort" value={String(view.stats.activePrograms)} />
            <StatCell
              label="On track"
              sub={`${view.stats.onTrackPct}% of programs`}
              value={String(view.stats.onTrack)}
              valueColor="#0A6E45"
            />
            <StatCell
              label="At risk"
              sub="behind pace"
              value={String(view.stats.atRisk)}
              valueColor="#D4810A"
            />
            <StatCell
              label="Overdue items"
              sub="need action now"
              subColor="#B83128"
              value={String(view.stats.overdueItems)}
              valueColor="#B83128"
            />
            <StatCell
              label="Avg completion"
              progress={view.stats.avgCompletion}
              sub=""
              value={`${view.stats.avgCompletion}%`}
              valueColor="#0071CE"
            />
            <StatCell
              label="Cert gates cleared"
              last
              sub="this quarter"
              value={String(view.stats.certGatesCleared)}
              valueSuffix={`/${view.stats.certGatesTotal}`}
            />
          </div>

          <div className="-mx-5 flex border-t border-[#E2DFD9]">
            {(["cohort", "programs", "milestones"] as ProgramTrackerTab[]).map((mode) => (
              <button
                className={`flex items-center gap-1.5 px-5 py-2.5 font-mono text-[8.5px] tracking-wide ${
                  tab === mode
                    ? "border-b-2 border-[#0071CE] text-[#0071CE]"
                    : "border-b-2 border-transparent text-[#A09D98]"
                }`}
                key={mode}
                onClick={() => setTab(mode)}
                type="button"
              >
                {mode.toUpperCase()}
                {mode === "milestones" && view.overdueCount > 0 ? (
                  <span className="rounded-full bg-[#B83128] px-1.5 py-px text-[7.5px] text-white">
                    {view.overdueCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Tab body */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F5F4F0]">
          {tab === "cohort" ? (
            <div className="p-5">
              <div className="mb-4 overflow-hidden border border-[#E2DFD9] bg-white">
                <div className="flex items-center justify-between border-b border-[#E2DFD9] bg-[#F9F8F6] px-4 py-2.5">
                  <div>
                    <span className="font-display text-[13px] font-bold text-[#0D0E12]">
                      SE-I Onboarding Program
                    </span>
                    <span className="ml-2.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">
                      4-phase · Weeks 1–12
                    </span>
                  </div>
                  <Link
                    className="inline-flex items-center border border-[#D4D1CB] px-2 py-1 text-[9px] font-semibold text-[#3D3C38] hover:border-[#0071CE] hover:text-[#0071CE]"
                    href="/plan-calendar"
                  >
                    View plan calendar →
                  </Link>
                </div>

                <div
                  className="grid gap-px border-b border-[#E2DFD9] bg-[#E2DFD9]"
                  style={{ gridTemplateColumns: "180px repeat(4, 1fr) 80px" }}
                >
                  <div className="bg-[#F9F8F6] px-3.5 py-2">
                    <span className="font-mono text-[7.5px] uppercase tracking-wide text-[#A09D98]">SE</span>
                  </div>
                  {[
                    ["PHASE 1", "Foundations · Wks 1–2"],
                    ["PHASE 2", "Technical Depth · Wks 3–4"],
                    ["PHASE 3", "Field Application · Wks 5–6"],
                    ["PHASE 4", "Cert Gates · Ongoing"],
                  ].map(([phase, sub]) => (
                    <div className="bg-[#F9F8F6] px-3 py-2" key={phase}>
                      <div className="font-mono text-[7.5px] font-medium text-[#3D3C38]">{phase}</div>
                      <div className="mt-0.5 text-[9px] text-[#A09D98]">{sub}</div>
                    </div>
                  ))}
                  <div className="bg-[#F9F8F6] px-3 py-2 text-center">
                    <span className="font-mono text-[7.5px] uppercase tracking-wide text-[#A09D98]">
                      Overall
                    </span>
                  </div>
                </div>

                {view.cohortRows.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[#6B6860]">
                    No team members in scope.{" "}
                    <Link className="font-semibold text-[#0071CE] hover:underline" href="/plans">
                      Assign plans →
                    </Link>
                  </div>
                ) : (
                  view.cohortRows.map((row) => (
                    <button
                      className="grid w-full gap-px border-b border-[#E2DFD9] bg-[#E2DFD9] text-left transition-colors last:border-b-0 hover:opacity-95"
                      key={row.userId}
                      onClick={() => setDrawerUserId(row.userId)}
                      style={{ gridTemplateColumns: "180px repeat(4, 1fr) 80px" }}
                      type="button"
                    >
                      <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 hover:bg-[#F9F8F6]">
                        <Avatar bg={row.avatarBg} initials={row.initials} />
                        <div>
                          <div className="text-xs font-medium text-[#0D0E12]">{row.name}</div>
                          <div className="font-mono text-[8px] text-[#A09D98]">
                            {row.level} · Day {row.day}
                          </div>
                        </div>
                      </div>
                      {row.phases.map((phase, index) => (
                        <div
                          className="flex flex-col justify-center gap-0.5 px-3 py-2.5"
                          key={index}
                          style={{ background: phase.bg }}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-[11px]" style={{ color: phase.textColor }}>
                              {phase.icon}
                            </span>
                            <span className="text-[11px] font-medium" style={{ color: phase.textColor }}>
                              {phase.label}
                            </span>
                          </div>
                          {phase.sub ? (
                            <div className="text-[9px] text-[#A09D98]">{phase.sub}</div>
                          ) : null}
                        </div>
                      ))}
                      <div className="flex flex-col items-center justify-center gap-1 bg-white px-3 py-2.5">
                        <span
                          className="font-mono text-sm font-medium"
                          style={{ color: row.overallColor }}
                        >
                          {row.overall}
                        </span>
                        <div className="h-[3px] w-14 overflow-hidden bg-[#ECEAE6]">
                          <div
                            className="h-full"
                            style={{
                              width: row.overall === "—" ? "0%" : row.overall,
                              background: row.overallColor,
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="grid gap-3.5 lg:grid-cols-2">
                <div className="border border-[#E2DFD9] bg-white px-4 py-3.5">
                  <p className="mb-3 font-display text-[13px] font-bold text-[#0D0E12]">
                    Phase definitions
                  </p>
                  {PROGRAM_PHASE_DEFINITIONS.map((phase) => (
                    <div
                      className="flex gap-3 border-b border-[#F0EFEB] py-2.5 last:border-b-0"
                      key={phase.name}
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center text-[13px]"
                        style={{ background: phase.bg, border: `1px solid ${phase.border}` }}
                      >
                        {phase.emoji}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#0D0E12]">{phase.name}</p>
                        <p className="mt-0.5 text-[10.5px] leading-snug text-[#7A7772]">{phase.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border border-[#E2DFD9] bg-white">
                  <div className="flex items-center justify-between border-b border-[#E2DFD9] px-4 py-3">
                    <div>
                      <p className="font-display text-[13px] font-bold text-[#0D0E12]">
                        Overdue milestones
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-[#B83128]">
                        {view.milestonesOverdue.length} items need action now
                      </p>
                    </div>
                    <button
                      className="border border-[#D4D1CB] px-2 py-1 text-[9px] font-semibold text-[#3D3C38] hover:border-[#0071CE]"
                      onClick={() => setTab("milestones")}
                      type="button"
                    >
                      See all →
                    </button>
                  </div>
                  {view.milestonesOverdue.slice(0, 6).map((item) => (
                    <div
                      className="flex items-center justify-between border-b border-[#F0EFEB] px-4 py-2 last:border-b-0"
                      key={item.id}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 shrink-0 text-center font-mono text-[8px] font-medium text-[#B83128]">
                          {item.dateShort}
                        </span>
                        <div>
                          <p className="text-[11px] font-medium text-[#0D0E12]">{item.label}</p>
                          <p className="text-[9.5px] text-[#A09D98]">{item.program}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="bg-[#FEF0EE] px-1.5 py-0.5 font-mono text-[8px] tracking-wide text-[#B83128]">
                          OVERDUE
                        </span>
                        <button
                          className="border border-[rgba(0,113,206,.2)] bg-[#F0F7FF] px-2 py-0.5 text-[9px] font-semibold text-[#0071CE] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            actionLoading[`nudge:${item.assignmentStepId}`] ||
                            nudgeStatus[item.assignmentStepId]?.canNudge === false
                          }
                          onClick={() => handleNudge(item)}
                          title={nudgeStatus[item.assignmentStepId]?.reason}
                          type="button"
                        >
                          {actionLoading[`nudge:${item.assignmentStepId}`]
                            ? "Sending…"
                            : nudgeStatus[item.assignmentStepId]?.canNudge === false
                              ? "Nudged"
                              : "Nudge"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "programs" ? (
            <div className="p-5">
              {view.sePrograms.map((se) => (
                <div className="mb-4" key={se.userId}>
                  <button
                    className="mb-2 flex w-full items-center gap-2.5 text-left"
                    onClick={() => setDrawerUserId(se.userId)}
                    type="button"
                  >
                    <Avatar bg={se.avatarBg} fontSize={10} initials={se.initials} size={32} />
                    <div>
                      <span className="text-[13px] font-semibold text-[#0D0E12]">{se.name}</span>
                      <span className="ml-2 font-mono text-[9px] text-[#A09D98]">
                        {se.level} · Day {se.day}
                      </span>
                    </div>
                    <span
                      className="ml-1 font-mono text-[8px] tracking-wide"
                      style={{ color: se.healthColor, background: se.healthBg, padding: "2px 8px" }}
                    >
                      {se.healthLabel}
                    </span>
                    <span className="ml-auto text-[10px] text-[#A09D98]">
                      {se.programCount} active program{se.programCount === 1 ? "" : "s"}
                    </span>
                  </button>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                    {se.programs.map((program) => (
                      <div
                        className="border bg-white px-3.5 py-3"
                        key={program.id}
                        style={{ borderColor: program.borderColor }}
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: program.typeColor }}
                            />
                            <span
                              className="font-mono text-[7.5px] uppercase tracking-wide"
                              style={{ color: program.typeColor }}
                            >
                              {program.type}
                            </span>
                          </div>
                          <span
                            className="font-mono text-[7.5px] tracking-wide"
                            style={{
                              color: program.statusColor,
                              background: program.statusBg,
                              padding: "2px 6px",
                            }}
                          >
                            {program.status}
                          </span>
                        </div>
                        <p className="mb-1 text-xs font-semibold leading-snug text-[#0D0E12]">
                          {program.name}
                        </p>
                        <p className="mb-2 text-[10px] text-[#7A7772]">{program.subtitle}</p>
                        <div className="mb-1 flex justify-between">
                          <span className="text-[9.5px] text-[#6B6860]">Progress</span>
                          <span
                            className="font-mono text-[9.5px] font-medium"
                            style={{ color: program.statusColor }}
                          >
                            {program.pct}%
                          </span>
                        </div>
                        <div className="mb-2 h-[3px] overflow-hidden bg-[#ECEAE6]">
                          <div
                            className="h-full"
                            style={{ width: `${program.pct}%`, background: program.statusColor }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-[#A09D98]">Due {program.due}</span>
                          <Link
                            className="border border-[#D4D1CB] px-2 py-0.5 text-[9px] font-semibold text-[#3D3C38] hover:border-[#0071CE] hover:text-[#0071CE]"
                            href={`/manager?section=roster&profile=${se.userId}`}
                          >
                            Open →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {tab === "milestones" ? (
            <div className="grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
              <div>
                <MilestoneSection
                  actionLoading={actionLoading}
                  actions="overdue"
                  datePickerStepId={datePickerStepId}
                  dotColor="#B83128"
                  items={view.milestonesOverdue}
                  label="Overdue"
                  nudgeStatus={nudgeStatus}
                  onMarkDone={handleMarkDone}
                  onNudge={handleNudge}
                  onReschedule={handleReschedule}
                  onRescheduleToDate={handleRescheduleToDate}
                  setDatePickerStepId={setDatePickerStepId}
                />
                <MilestoneSection
                  actions="thisWeek"
                  dotColor="#D4810A"
                  items={view.milestonesThisWeek}
                  label="Due this week"
                />
                <MilestoneSection
                  actions="upcoming"
                  dotColor="#A09D98"
                  items={view.milestonesUpcoming}
                  label="Upcoming · next 2 weeks"
                />
                <MilestoneSection
                  actions="later"
                  dotColor="#6B6860"
                  items={view.milestonesLater}
                  label="Later"
                />
                {view.milestonesOverdue.length === 0 &&
                view.milestonesThisWeek.length === 0 &&
                view.milestonesUpcoming.length === 0 &&
                view.milestonesLater.length === 0 ? (
                  <p className="text-[11px] text-[#A09D98]">No open milestones on the horizon.</p>
                ) : null}
                <p className="mt-2 text-[10px] text-[#A09D98]">
                  Rescheduled milestones stay here by due date, or view the full timeline on{" "}
                  <Link className="font-semibold text-[#0071CE] hover:underline" href="/plan-calendar">
                    Plan Calendar
                  </Link>
                  .
                </p>
              </div>

              <div className="sticky top-0 border border-[#E2DFD9] bg-white">
                <div className="border-b border-[#E2DFD9] px-4 py-3">
                  <p className="font-mono text-[8px] uppercase tracking-wide text-[#D4810A]">
                    Manager sign-off queue
                  </p>
                  <p className="text-[11.5px] font-semibold text-[#0D0E12]">
                    {view.signOffItems.length} item{view.signOffItems.length === 1 ? "" : "s"} waiting
                  </p>
                </div>
                {view.signOffItems.length === 0 ? (
                  <p className="px-4 py-6 text-[11px] text-[#A09D98]">No pending sign-offs.</p>
                ) : (
                  view.signOffItems.map((item) => (
                    <div className="border-b border-[#F0EFEB] px-4 py-3 last:border-b-0" key={item.id}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <Avatar bg={item.avatarBg} fontSize={8} initials={item.seInitials} size={22} />
                        <span className="text-[11px] font-medium text-[#0D0E12]">{item.title}</span>
                      </div>
                      <p className="mb-2 text-[10.5px] leading-snug text-[#6B6860]">{item.description}</p>
                      <div className="flex gap-1.5">
                        <button
                          className="border border-[rgba(10,110,69,.2)] bg-[#EDFAF3] px-2 py-1 text-[9px] font-semibold text-[#0A6E45]"
                          onClick={() => router.push("/manager?section=inbox")}
                          type="button"
                        >
                          Approve ✓
                        </button>
                        <button
                          className="border border-[#D4D1CB] px-2 py-1 text-[9px] font-semibold text-[#3D3C38]"
                          onClick={() => router.push("/manager?section=inbox")}
                          type="button"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <ProgramTrackerSeDrawer onClose={() => setDrawerUserId(null)} profile={drawerProfile} />
    </>
  );
}

function StatCell({
  label,
  value,
  sub,
  valueColor = "#0D0E12",
  subColor = "#7A7772",
  progress,
  valueSuffix,
  last,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
  subColor?: string;
  progress?: number;
  valueSuffix?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`bg-white px-4 py-3 ${last ? "" : "border-r border-[#E2DFD9] lg:border-r"}`}
    >
      <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">{label}</p>
      <p className="font-display text-[22px] font-bold leading-none" style={{ color: valueColor }}>
        {value}
        {valueSuffix ? (
          <span className="text-sm font-medium text-[#A09D98]">{valueSuffix}</span>
        ) : null}
      </p>
      {progress !== undefined ? (
        <div className="mt-1.5 h-[3px] overflow-hidden bg-[#ECEAE6]">
          <div className="h-full" style={{ width: `${progress}%`, background: valueColor }} />
        </div>
      ) : (
        <p className="mt-0.5 text-[10px]" style={{ color: subColor }}>
          {sub}
        </p>
      )}
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

  useEffect(() => {
    if (open) {
      setPickedDate(addCalendarDays(todayIso(), 14));
    }
  }, [open, item.assignmentStepId]);

  if (!open) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[#F0EFEB] bg-[#F9F8F6] px-4 py-2.5">
      <span className="text-[10px] text-[#6B6860]">
        Was {formatMilestoneDate(item.isoDate)} — pick new due date
      </span>
      <Input
        className="h-8 w-[10.5rem] text-xs"
        min={todayIso()}
        onChange={(event) => setPickedDate(event.target.value)}
        type="date"
        value={pickedDate}
      />
      <button
        className="border border-[rgba(0,113,206,.2)] bg-[#F0F7FF] px-2 py-1 text-[9px] font-semibold text-[#0071CE] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!pickedDate || saving}
        onClick={() => onApply(pickedDate)}
        type="button"
      >
        {saving ? "Saving…" : "Apply"}
      </button>
      <button
        className="border border-[#D4D1CB] px-2 py-1 text-[9px] font-semibold text-[#3D3C38]"
        disabled={saving}
        onClick={onCancel}
        type="button"
      >
        Cancel
      </button>
    </div>
  );
}

function MilestoneSection({
  label,
  dotColor,
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
  dotColor: string;
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
  const textColor =
    actions === "overdue"
      ? "#B83128"
      : actions === "thisWeek"
        ? "#D4810A"
        : actions === "later"
          ? "#6B6860"
          : "#A09D98";
  const borderColor =
    actions === "overdue"
      ? "rgba(184,49,40,.2)"
      : actions === "thisWeek"
        ? "rgba(212,129,10,.2)"
        : actions === "later"
          ? "rgba(107,104,96,.2)"
          : "#E2DFD9";

  if (items.length === 0) return null;

  return (
    <div className="mb-3.5">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ background: dotColor }} />
        <span
          className="font-mono text-[8px] font-medium uppercase tracking-[0.1em]"
          style={{ color: textColor }}
        >
          {label} · {items.length} items
        </span>
      </div>
      <div className="border bg-white" style={{ borderColor }}>
        {items.map((item) => (
          <div className="border-b border-[#F0EFEB] last:border-b-0" key={item.id}>
            <div className="flex items-center gap-3.5 px-4 py-2.5">
              <div className="w-9 shrink-0 text-center">
                <div className="font-mono text-[9px] font-medium" style={{ color: textColor }}>
                  {item.dateShort}
                </div>
                <div className="font-mono text-[7.5px]" style={{ color: textColor }}>
                  {item.dayOfWeek}
                </div>
              </div>
              <div className="h-8 w-px shrink-0" style={{ background: borderColor }} />
              <Avatar bg={item.avatarBg} fontSize={8} initials={item.initials} size={24} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[#0D0E12]">{item.se}</p>
                <p className="text-[11.5px] text-[#0D0E12]">{item.label}</p>
                <p className="font-mono text-[8.5px] text-[#A09D98]">{item.program}</p>
              </div>
              {actions === "overdue" ? (
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <button
                    className="border border-[rgba(0,113,206,.2)] bg-[#F0F7FF] px-2 py-1 text-[9px] font-semibold text-[#0071CE] disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="border border-[#D4D1CB] px-2 py-1 text-[9px] font-semibold text-[#3D3C38] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={actionLoading[`reschedule:${item.assignmentStepId}`]}
                    onClick={() => onReschedule?.(item)}
                    title="Move due date forward 7 days from today"
                    type="button"
                  >
                    {actionLoading[`reschedule:${item.assignmentStepId}`] ? "Saving…" : "+7 days"}
                  </button>
                  <button
                    className="border border-[#D4D1CB] px-2 py-1 text-[9px] font-semibold text-[#3D3C38] disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="border border-[rgba(10,110,69,.2)] bg-[#EDFAF3] px-2 py-1 text-[9px] font-semibold text-[#0A6E45] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={actionLoading[`complete:${item.assignmentStepId}`]}
                    onClick={() => onMarkDone?.(item)}
                    type="button"
                  >
                    {actionLoading[`complete:${item.assignmentStepId}`] ? "Saving…" : "Mark done"}
                  </button>
                </div>
              ) : null}
              {actions === "thisWeek" ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    className="border border-[rgba(212,129,10,.2)] bg-[#FFFBF0] px-2 py-1 text-[9px] font-semibold text-[#D4810A]"
                    type="button"
                  >
                    Remind SE
                  </button>
                  <Link
                    className="border border-[#D4D1CB] px-2 py-1 text-[9px] font-semibold text-[#3D3C38]"
                    href={`/manager?section=roster&profile=${item.userId}`}
                  >
                    View step
                  </Link>
                  <Link
                    className="border border-[rgba(0,113,206,.2)] bg-[#F0F7FF] px-2 py-1 text-[9px] font-semibold text-[#0071CE]"
                    href={planCalendarHref(item.userId)}
                  >
                    Calendar
                  </Link>
                </div>
              ) : null}
              {actions === "upcoming" || actions === "later" ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  {item.daysAway ? (
                    <span className="shrink-0 font-mono text-[9px] text-[#A09D98]">{item.daysAway}</span>
                  ) : null}
                  <Link
                    className="border border-[rgba(0,113,206,.2)] bg-[#F0F7FF] px-2 py-1 text-[9px] font-semibold text-[#0071CE]"
                    href={planCalendarHref(item.userId)}
                  >
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
          </div>
        ))}
      </div>
    </div>
  );
}
