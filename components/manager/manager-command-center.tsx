"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CertReviewItem } from "@/components/manager/cert-review-item";
import type { ReviewItem } from "@/components/manager/review-queue";
import {
  HEATMAP_GRID_COLS,
  ManagerMetricCard,
  ManagerOutlineBtn,
  healthBadgeStyle,
  rampPillStyle,
  simPillStyle,
} from "@/components/manager/manager-ui-primitives";
import { SailPointLogoMark } from "@/components/shell/sailpoint-logo-mark";
import type { CoachingCadenceRow } from "@/lib/manager/coaching-cadence";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import type { TeamReadinessRow } from "@/lib/manager/team-readiness";
import { currentQuarter } from "@/lib/development/plan-utils";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import type { DevelopmentPlan, Profile, UserPlan } from "@/lib/types";
import { initials } from "@/lib/utils";

function statusPill(row: TeamReadinessRow) {
  if (row.openReviews > 0) {
    return { label: "Review due", bg: "#dbeafe", color: "#1d4ed8" };
  }
  if (row.readinessIndex < 70) {
    return { label: "At risk", bg: "#fee2e2", color: "#dc2626" };
  }
  return { label: "On track", bg: "#dcfce7", color: "#15803d" };
}

function formatLast1on1(days: number | null) {
  if (days === null) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function ReadinessHeatmapGrid({
  rows,
  plans,
  coachingByUser,
  reviewedChallengeCountByUser = {},
  approvedCertCountByUser = {},
  challengeTotalByUser = {},
  onSelectProfile,
}: {
  rows: TeamReadinessRow[];
  plans: UserPlan[];
  coachingByUser: Record<string, SeCoachingSummary>;
  reviewedChallengeCountByUser?: Record<string, number>;
  approvedCertCountByUser?: Record<string, number>;
  challengeTotalByUser?: Record<string, number>;
  onSelectProfile?: (profileId: string) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] px-[18px] py-3">
        <div>
          <h2 className="text-[12.5px] font-bold text-[#0a1628]">Team readiness heatmap</h2>
          <p className="mt-[1px] text-[10.5px] text-[#94a3b8]">Click any SE to open their profile</p>
        </div>
        <ManagerOutlineBtn href="/manager?section=readiness">Full view →</ManagerOutlineBtn>
      </div>
      <div
        className="grid border-b border-[#f1f5f9] px-[18px] py-[8px]"
        style={{ gridTemplateColumns: HEATMAP_GRID_COLS }}
      >
        {["SE", "Onboarding", "Sim avg", "Challenges", "Certs", "Dev goals", "Status"].map((h) => (
          <span
            className="text-center text-[9.5px] font-bold uppercase tracking-[0.06em] text-[#94a3b8] first:text-left"
            key={h}
          >
            {h}
          </span>
        ))}
      </div>
      {rows.map((row) => {
        const plan = plans.find((item) => item.userId === row.profileId);
        const coaching = coachingByUser[row.profileId];
        const ramp = plan?.progress ?? 0;
        const rampStyle = rampPillStyle(ramp);
        const simStyle = simPillStyle(row.simAvg);
        const status = statusPill(row);
        const reviewedChallenges = reviewedChallengeCountByUser[row.profileId] ?? 0;
        const challengeTotal = challengeTotalByUser[row.profileId] ?? Math.max(reviewedChallenges, 4);
        const approvedCerts = approvedCertCountByUser[row.profileId] ?? 0;
        const devGoals =
          coaching && coaching.devGoalsTotal > 0
            ? `${coaching.devGoalsOnTrack}/${coaching.devGoalsTotal}`
            : "—";

        return (
          <button
            className="grid w-full items-center border-b border-[#f9fafb] px-[18px] py-[9px] text-left transition last:border-b-0 hover:bg-[#f7fafd]"
            key={row.profileId}
            onClick={() => onSelectProfile?.(row.profileId)}
            style={{ gridTemplateColumns: HEATMAP_GRID_COLS }}
            type="button"
          >
            <div className="flex items-center gap-[8px]">
              <div
                className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: avatarGradientForId(row.profileId) }}
              >
                {initials(row.fullName)}
              </div>
              <div className="text-left">
                <p className="text-[11.5px] font-semibold text-[#1e293b]">{row.fullName}</p>
                <p className="text-[9.5px] text-[#94a3b8]">{row.level}</p>
              </div>
            </div>
            <div className="flex justify-center">
              <span
                className="inline-block rounded-lg px-[8px] py-[3px] text-[11px] font-bold"
                style={{ background: rampStyle.bg, color: rampStyle.color }}
              >
                {ramp}%
              </span>
            </div>
            <div className="flex justify-center">
              <span
                className="inline-block rounded-lg px-[8px] py-[3px] text-[11px] font-bold"
                style={{ background: simStyle.bg, color: simStyle.color }}
              >
                {row.simAvg ?? "—"}
              </span>
            </div>
            <p className="text-center text-[11.5px] font-semibold text-[#475569]">
              {reviewedChallenges}/{challengeTotal}
            </p>
            <p className="text-center text-[11.5px] font-semibold text-[#475569]">{approvedCerts}/5</p>
            <p className="text-center text-[11.5px] font-semibold text-[#475569]">{devGoals}</p>
            <div className="flex justify-center">
              <span
                className="rounded-full px-[8px] py-[2.5px] text-[9px] font-bold"
                style={{ background: status.bg, color: status.color }}
              >
                {status.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function InlineCoachingCadenceTable({
  rows,
  plans,
  coachingByUser,
  onSelectProfile,
}: {
  rows: CoachingCadenceRow[];
  plans: UserPlan[];
  coachingByUser: Record<string, SeCoachingSummary>;
  onSelectProfile?: (profileId: string) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] p-[13px_16px_11px]">
        <div>
          <p className="text-[12.5px] font-bold text-[#0a1628]">Coaching cadence</p>
          <p className="mt-[1px] text-[10.5px] text-[#94a3b8]">Who needs a 1:1 this week</p>
        </div>
        <ManagerOutlineBtn>Schedule all</ManagerOutlineBtn>
      </div>
      <div className="py-[6px]">
        {rows.slice(0, 6).map((row) => {
          const coaching = coachingByUser[row.profileId];
          const plan = plans.find((item) => item.userId === row.profileId);
          const ramp = plan?.progress ?? coaching?.onboardingProgress ?? 0;
          const simAvg = coaching?.latestSimScore ?? coaching?.avgSimScore;
          const health = coaching ? healthBadgeStyle(coaching.health) : healthBadgeStyle("on_track");

          return (
            <button
              className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-left transition hover:bg-[#f7fafd]"
              key={row.profileId}
              onClick={() => onSelectProfile?.(row.profileId)}
              type="button"
            >
              <div
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: avatarGradientForId(row.profileId) }}
              >
                {initials(row.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-[2px] flex items-center gap-[6px]">
                  <span className="text-[12px] font-semibold text-[#1e293b]">{row.fullName}</span>
                  <span
                    className="rounded-full px-[7px] py-[1.5px] text-[9px] font-bold"
                    style={{ background: health.bg, color: health.color }}
                  >
                    {health.label}
                  </span>
                </div>
                <p className="text-[10.5px] text-[#94a3b8]">
                  Last 1:1: {formatLast1on1(row.daysSinceCoaching)} · Ramp: {ramp}%
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className="text-[11px] font-semibold"
                  style={{ color: simAvg != null ? simPillStyle(simAvg).color : "#94a3b8" }}
                >
                  {simAvg ?? "—"}
                </p>
                <p className="text-[9.5px] text-[#94a3b8]">Sim avg</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ManagerCommandCenter({
  reviewCount,
  pendingCertCount = 0,
  teamSize,
  averageProgress,
  reviewItems,
  org,
  plans,
  readinessRows = [],
  cadenceRows = [],
  coachingByUser,
  developmentPlans = [],
  certReviewItems = [],
  planStepCount = 0,
  reviewedChallengeCountByUser = {},
  approvedCertCountByUser = {},
  challengeTotalByUser = {},
  managerFirstName = "there",
  managerRegion = "Your team",
  onSelectProfile,
}: {
  reviewCount: number;
  pendingCertCount?: number;
  teamSize: number;
  averageProgress: number;
  reviewItems: ReviewItem[];
  org: Profile[];
  plans: UserPlan[];
  readinessRows?: TeamReadinessRow[];
  cadenceRows?: CoachingCadenceRow[];
  coachingByUser: Record<string, SeCoachingSummary>;
  developmentPlans?: DevelopmentPlan[];
  certReviewItems?: CertReviewItem[];
  planStepCount?: number;
  reviewedChallengeCountByUser?: Record<string, number>;
  approvedCertCountByUser?: Record<string, number>;
  challengeTotalByUser?: Record<string, number>;
  managerFirstName?: string;
  managerRegion?: string;
  onSelectProfile?: (profileId: string) => void;
}) {
  const atRiskRows = useMemo(
    () => readinessRows.filter((row) => row.readinessIndex < 70 || row.openReviews > 0),
    [readinessRows],
  );
  const atRiskRow = atRiskRows[0] ?? null;

  const challengeCount = reviewItems.filter((item) => item.kind === "submission").length;
  const simCount = reviewItems.filter((item) => item.kind === "coaching").length;
  const planCount = planStepCount;

  const topInboxItem = useMemo(() => {
    const first = reviewItems[0];
    if (first) {
      return { title: `${first.personName} — ${first.title}` };
    }
    const cert = certReviewItems[0];
    if (cert) {
      return { title: `${cert.personName} — ${cert.label}` };
    }
    return { title: "No pending items" };
  }, [reviewItems, certReviewItems]);

  const attestationAlert = useMemo(() => {
    for (const plan of developmentPlans) {
      const person = org.find((profile) => profile.id === plan.userId);
      for (const goal of plan.goals) {
        for (const review of goal.quarterlyReviews) {
          if (
            review.status === "not_started" &&
            new Date(review.dueDate).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000
          ) {
            const days = Math.max(
              0,
              Math.ceil((new Date(review.dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
            );
            return {
              name: person?.fullName ?? "Team member",
              quarter: review.quarter,
              days,
              href: `/manager?section=dev&profile=${plan.userId}`,
            };
          }
        }
      }
    }
    return null;
  }, [developmentPlans, org]);

  const quarter = currentQuarter();
  const year = new Date().getFullYear();

  return (
    <div className="space-y-[14px]">
      {attestationAlert ? (
        <div
          className="mb-[14px] flex items-center gap-[10px] rounded-[10px] px-[14px] py-[10px]"
          style={{ background: "linear-gradient(90deg,#fef3c7,#fef9ec)", border: "1px solid #fde68a" }}
        >
          <svg
            fill="none"
            height="14"
            stroke="#d97706"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
            viewBox="0 0 16 16"
            width="14"
          >
            <path d="M8 2L15 13H1z" />
            <line x1="8" x2="8" y1="7" y2="10" />
            <circle cx="8" cy="11.5" fill="#d97706" r=".5" stroke="none" />
          </svg>
          <p className="flex-1 text-[11.5px] font-semibold text-[#92400e]">
            {attestationAlert.name.split(" ")[0]}&apos;s {attestationAlert.quarter} development plan needs your
            quarterly attestation — due in <strong>{attestationAlert.days} days</strong>.
          </p>
          <ManagerOutlineBtn href={attestationAlert.href}>Review now →</ManagerOutlineBtn>
        </div>
      ) : null}

      <div
        className="relative mb-[14px] overflow-hidden rounded-2xl p-[20px_24px]"
        style={{ background: "linear-gradient(145deg,#001228 0%,#00204e 55%,#002668 100%)" }}
      >
        <div
          className="pointer-events-none absolute -right-[20px] -top-[50px] h-[220px] w-[220px] rounded-full"
          style={{ background: "rgba(204,39,176,0.08)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-[40px] left-[20px] h-[150px] w-[150px] rounded-full"
          style={{ background: "rgba(0,113,206,0.07)" }}
        />

        <div className="relative flex items-center justify-between gap-[20px]">
          <div className="flex-1">
            <div className="mb-[10px] flex items-center gap-[8px]">
              <SailPointLogoMark className="h-[18px] w-[18px]" variant="flat-white" />
              <span className="font-display text-[13px] font-extrabold tracking-[-0.01em] text-white/90">
                SailPoint
              </span>
              <div className="h-[14px] w-px bg-white/20" />
              <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-white/40">
                {managerRegion} · {quarter} FY{year}
              </span>
            </div>

            <h1 className="mb-[10px] font-display text-[20px] font-extrabold tracking-[-0.02em] text-white">
              {reviewCount} items need your review, {managerFirstName}
            </h1>

            {reviewCount > 0 ? (
              <div
                className="flex max-w-[580px] items-center justify-between gap-[14px] rounded-xl p-[12px_16px]"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <div className="flex items-center gap-[10px]">
                  <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#f59e0b] animate-pulse-dot" />
                  <div>
                    <p className="mb-[2px] text-[9.5px] font-bold uppercase tracking-[0.07em] text-white/42">
                      Priority · Action Inbox
                    </p>
                    <p className="font-display text-[13.5px] font-bold text-white">{topInboxItem.title}</p>
                  </div>
                </div>
                <Link
                  className="inline-flex shrink-0 items-center gap-[5px] rounded-lg bg-[#0071ce] px-[18px] py-[9px] text-[12.5px] font-semibold text-white"
                  href="/manager?section=inbox"
                >
                  Review →
                </Link>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 gap-[18px]">
            {[
              { value: reviewCount, label: "Inbox", color: "#f59e0b" },
              { value: teamSize, label: "SEs", color: "white" },
              { value: `${averageProgress}%`, label: "Avg progress", color: "#60a5fa" },
            ].map((stat) => (
              <div
                className="rounded-[10px] px-[16px] py-[12px] text-center"
                key={stat.label}
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <p className="font-display text-[26px] font-extrabold leading-none" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <p className="mt-[3px] text-[9.5px] text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-[16px] grid grid-cols-4 gap-[12px]">
        <ManagerMetricCard
          accent="#f59e0b"
          label="Reviews pending"
          sub={`${challengeCount} challenges · ${simCount} sim cards · ${planCount} plan steps`}
          subColor="#f59e0b"
          value={reviewCount}
        />

        <div className="rounded-xl border border-[#e2eaf5] bg-white p-[14px_16px]" style={{ borderLeft: "3px solid #0071ce" }}>
          <p className="mb-[8px] text-[10px] font-semibold text-[#64748b]">Team avg progress</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">{averageProgress}%</p>
          <div className="mt-[8px] h-[3px] overflow-hidden rounded-full bg-[#e8f2fc]">
            <div className="prog-fill h-full rounded-full bg-[#0071ce]" style={{ width: `${averageProgress}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-[#e2eaf5] bg-white p-[14px_16px]" style={{ borderLeft: "3px solid #ef4444" }}>
          <p className="mb-[8px] text-[10px] font-semibold text-[#64748b]">At risk</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">{atRiskRows.length}</p>
          {atRiskRow ? (
            <Link
              className="mt-[6px] block cursor-pointer text-[10px] font-semibold text-[#ef4444]"
              href={`/manager?profile=${atRiskRow.profileId}`}
            >
              {atRiskRow.fullName.split(" ")[0]} — below target →
            </Link>
          ) : null}
        </div>

        <ManagerMetricCard
          accent="#cc27b0"
          label="Cert sign-offs"
          sub="Awaiting your approval"
          subColor="#cc27b0"
          value={pendingCertCount}
        />
      </div>

      <InlineCoachingCadenceTable
        coachingByUser={coachingByUser}
        onSelectProfile={onSelectProfile}
        plans={plans}
        rows={cadenceRows}
      />

      <ReadinessHeatmapGrid
        approvedCertCountByUser={approvedCertCountByUser}
        challengeTotalByUser={challengeTotalByUser}
        coachingByUser={coachingByUser}
        onSelectProfile={onSelectProfile}
        plans={plans}
        reviewedChallengeCountByUser={reviewedChallengeCountByUser}
        rows={readinessRows}
      />
    </div>
  );
}
