"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CertReviewItem } from "@/components/manager/cert-review-item";
import type { ReviewItem } from "@/components/manager/review-queue";
import { ManagerRecentActivity } from "@/components/manager/manager-recent-activity";
import { TeamLeaderboard } from "@/components/gamification/team-leaderboard";
import {
  HEATMAP_GRID_COLS,
  ManagerAlertStrip,
  ManagerBentoGrid,
  ManagerOutlineBtn,
  ManagerStatColumn,
  healthBadgeStyle,
  rampBarColor,
  simPillStyle,
} from "@/components/manager/manager-ui-primitives";
import type { CoachingCadenceRow } from "@/lib/manager/coaching-cadence";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import type { TeamReadinessRow } from "@/lib/manager/team-readiness";
import { currentQuarter } from "@/lib/development/plan-utils";
import type { LeaderboardEntry } from "@/lib/gamification/leaderboard";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import type { ActivityLog, DevelopmentPlan, Profile, UserPlan } from "@/lib/types";
import { initials } from "@/lib/utils";

function statusPill(row: TeamReadinessRow) {
  if (row.openReviews > 0) {
    return { label: "Review due", bg: "#EEF4FF", color: "#0071CE" };
  }
  if (row.readinessIndex < 70) {
    return { label: "At risk", bg: "#FEF0EE", color: "#B83128" };
  }
  return { label: "On track", bg: "#EDFAF3", color: "#0A6E45" };
}

function formatLast1on1(days: number | null) {
  if (days === null) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function healthDotColor(health: SeCoachingSummary["health"]) {
  switch (health) {
    case "coach_now":
    case "at_risk":
      return "#B83128";
    case "stalled":
      return "#D4810A";
    case "waiting_on_se":
      return "#0071CE";
    default:
      return "#0A6E45";
  }
}

type InboxMiniItem = {
  id: string;
  type: string;
  label: string;
  person: string;
  time: string;
  accentColor: string;
  tagBg: string;
  tagColor: string;
};

function buildInboxMiniItems(
  reviewItems: ReviewItem[],
  certReviewItems: CertReviewItem[],
): InboxMiniItem[] {
  const items: InboxMiniItem[] = [];

  for (const item of reviewItems.slice(0, 4)) {
    if (item.kind === "submission") {
      items.push({
        id: item.id,
        type: "Challenge",
        label: item.title,
        person: item.personName,
        time: "Pending",
        accentColor: "#7c3aed",
        tagBg: "#ede9fe",
        tagColor: "#5b21b6",
      });
    } else {
      items.push({
        id: item.id,
        type: "Sim card",
        label: item.title,
        person: item.personName,
        time: "Pending",
        accentColor: "#CC27B0",
        tagBg: "#fdf0fa",
        tagColor: "#a51e8e",
      });
    }
  }

  for (const cert of certReviewItems.slice(0, Math.max(0, 4 - items.length))) {
    items.push({
      id: cert.id,
      type: "Cert",
      label: cert.label,
      person: cert.personName,
      time: "Pending",
      accentColor: "#0A6E45",
      tagBg: "#EDFAF3",
      tagColor: "#0A6E45",
    });
  }

  return items.slice(0, 4).filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index);
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
    <div className="mb-3 overflow-hidden border border-[#E2DFD9] bg-white">
      <div className="flex items-center justify-between border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-[11px]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[13px] font-bold text-[#0D0E12]">Team readiness</span>
          <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-[#B0ADA8]">
            Click row · open profile
          </span>
        </div>
        <ManagerOutlineBtn href="/manager?section=readiness">Full map →</ManagerOutlineBtn>
      </div>
      <div
        className="grid border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-1.5"
        style={{ gridTemplateColumns: HEATMAP_GRID_COLS }}
      >
        {["SE", "Onboarding", "Sim avg", "Challenges", "Certs", "Dev goals", "Status"].map((h) => (
          <span
            className="text-center font-mono text-[7.5px] uppercase tracking-[0.12em] text-[#B0ADA8] first:text-left"
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
            className="grid w-full items-center border-b border-[#F2F0EC] px-4 py-[9px] text-left transition last:border-b-0 hover:bg-[#F0EFEB]"
            key={row.profileId}
            onClick={() => onSelectProfile?.(row.profileId)}
            style={{ gridTemplateColumns: HEATMAP_GRID_COLS }}
            type="button"
          >
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[8.5px] font-medium text-white"
                style={{ background: avatarGradientForId(row.profileId) }}
              >
                {initials(row.fullName)}
              </div>
              <div className="text-left">
                <p className="text-[11.5px] font-medium text-[#0D0E12]">{row.fullName}</p>
                <p className="font-mono text-[8px] text-[#A09D98]">{row.level}</p>
              </div>
            </div>
            <div className="text-center">
              <span
                className="font-mono text-xs font-medium"
                style={{ color: rampBarColor(ramp) === "#0A6E45" ? "#0A6E45" : rampBarColor(ramp) === "#0071CE" ? "#0071CE" : "#B83128" }}
              >
                {ramp}%
              </span>
            </div>
            <div className="text-center">
              <span className="font-mono text-xs font-medium" style={{ color: simStyle.color }}>
                {row.simAvg ?? "—"}
              </span>
            </div>
            <p className="text-center font-mono text-[11px] text-[#4A4845]">
              {reviewedChallenges}/{challengeTotal}
            </p>
            <p className="text-center font-mono text-[11px] text-[#4A4845]">{approvedCerts}/5</p>
            <p className="text-center font-mono text-[11px] text-[#4A4845]">{devGoals}</p>
            <div className="flex justify-center">
              <span
                className="font-mono text-[8px] uppercase tracking-[0.08em] px-2 py-0.5"
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
  leaderboardEntries = [],
  activity = [],
  profiles = [],
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
  leaderboardEntries?: LeaderboardEntry[];
  activity?: ActivityLog[];
  profiles?: Profile[];
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

  const inboxMini = useMemo(
    () => buildInboxMiniItems(reviewItems, certReviewItems),
    [reviewItems, certReviewItems],
  );

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

  return (
    <div>
      {attestationAlert ? (
        <ManagerAlertStrip
          cta="Review now →"
          ctaHref={attestationAlert.href}
          message={
            <>
              {attestationAlert.name.split(" ")[0]}&apos;s {attestationAlert.quarter} development plan needs your
              quarterly attestation — due in{" "}
              <strong className="font-bold text-[#D4810A]">{attestationAlert.days} days</strong>
            </>
          }
        />
      ) : null}

      <ManagerBentoGrid columns="55fr 27fr 18fr">
        {/* Zone 1: Coaching queue */}
        <div className="bg-white">
          <div className="flex items-center justify-between border-b border-[#ECEAE6] px-4 py-3">
            <div>
              <span className="font-display text-[13.5px] font-bold text-[#0D0E12]">Coaching queue</span>
              <span className="ml-2 font-mono text-[8px] tracking-[0.06em] text-[#B0ADA8]">
                {cadenceRows.length} SE{cadenceRows.length === 1 ? "" : "s"}
              </span>
            </div>
            <ManagerOutlineBtn href="/manager?section=cadence">Schedule all</ManagerOutlineBtn>
          </div>
          <div
            className="grid border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-1.5"
            style={{ gridTemplateColumns: "1fr 72px 56px 84px" }}
          >
            {["SE", "Last 1:1", "Sim", "Ramp"].map((h) => (
              <span className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-[#B0ADA8]" key={h}>
                {h}
              </span>
            ))}
          </div>
          {cadenceRows.length === 0 ? (
            <p className="px-4 py-6 text-[11.5px] text-[#A09D98]">No coaching cadence data yet.</p>
          ) : (
            cadenceRows.map((row) => {
              const coaching = coachingByUser[row.profileId];
              const plan = plans.find((item) => item.userId === row.profileId);
              const ramp = plan?.progress ?? coaching?.onboardingProgress ?? 0;
              const simAvg = coaching?.latestSimScore ?? coaching?.avgSimScore;
              const health = coaching ? healthBadgeStyle(coaching.health) : healthBadgeStyle("on_track");

              return (
                <button
                  className="grid w-full items-center border-b border-[#F2F0EC] px-4 py-2.5 text-left transition last:border-b-0 hover:bg-[#F0EFEB]"
                  key={row.profileId}
                  onClick={() => onSelectProfile?.(row.profileId)}
                  style={{ gridTemplateColumns: "1fr 72px 56px 84px" }}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-medium text-white"
                      style={{ background: avatarGradientForId(row.profileId) }}
                    >
                      {initials(row.fullName)}
                    </div>
                    <div>
                      <p className="text-[11.5px] font-medium text-[#0D0E12]">{row.fullName}</p>
                      <div className="mt-0.5 flex items-center gap-1">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: healthDotColor(coaching?.health ?? "on_track") }}
                        />
                        <span className="font-mono text-[8px] text-[#A09D98]">{health.label}</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[#A09D98]">
                    {formatLast1on1(row.daysSinceCoaching)}
                  </span>
                  <span
                    className="font-mono text-[13px] font-medium"
                    style={{ color: simAvg != null ? simPillStyle(simAvg).color : "#A09D98" }}
                  >
                    {simAvg ?? "—"}
                  </span>
                  <div>
                    <span className="font-mono text-[10.5px] font-medium text-[#0D0E12]">{ramp}%</span>
                    <div className="relative mt-1 h-[3px] overflow-hidden bg-[#ECEAE6]">
                      <div
                        className="prog-fill absolute left-0 top-0 h-full"
                        style={{ width: `${ramp}%`, background: rampBarColor(ramp) }}
                      />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Zone 2: Inbox mini */}
        <div className="bg-white">
          <div className="flex items-baseline gap-2 border-b border-[#ECEAE6] px-[14px] py-3">
            <span className="font-display text-[13.5px] font-bold text-[#0D0E12]">Inbox</span>
            {reviewCount > 0 ? (
              <span className="animate-pulse-dot font-mono text-[9px] font-medium text-[#D4810A]">
                ● {reviewCount}
              </span>
            ) : null}
          </div>
          {inboxMini.length === 0 ? (
            <p className="px-[14px] py-6 text-[11.5px] text-[#A09D98]">Inbox clear.</p>
          ) : (
            inboxMini.map((item) => (
              <Link
                className="block border-b border-[#F2F0EC] px-[14px] py-2.5 transition hover:bg-[#F0EFEB]"
                href="/manager?section=inbox"
                key={item.id}
                style={{ borderLeft: `2px solid ${item.accentColor}` }}
              >
                <span
                  className="mb-1 inline-block font-mono text-[8px] uppercase tracking-[0.09em] px-1.5 py-px"
                  style={{ background: item.tagBg, color: item.tagColor }}
                >
                  {item.type}
                </span>
                <p className="text-[11.5px] font-medium leading-snug text-[#0D0E12]">{item.label}</p>
                <p className="font-mono text-[9px] text-[#A09D98]">
                  {item.person} · {item.time}
                </p>
              </Link>
            ))
          )}
          <div className="p-[9px_14px]">
            <ManagerOutlineBtn className="w-full justify-center" href="/manager?section=inbox">
              All {reviewCount} items →
            </ManagerOutlineBtn>
          </div>
        </div>

        {/* Zone 3: Metrics */}
        <div>
          <ManagerStatColumn
            label="Reviews"
            sub={`${challengeCount} chal · ${simCount} sim · ${planCount} plan`}
            subColor="#B0ADA8"
            value={reviewCount}
            valueColor="#D4810A"
          />
          <ManagerStatColumn
            label="Team ramp"
            sub={`${teamSize} SE${teamSize === 1 ? "" : "s"}`}
            subColor="#B0ADA8"
            value={`${averageProgress}%`}
            valueColor="#0071CE"
          />
          <ManagerStatColumn
            highlight={atRiskRows.length > 0}
            href={atRiskRow ? `/manager?profile=${atRiskRow.profileId}` : "/manager?section=roster"}
            label="At risk"
            sub={atRiskRow ? `${atRiskRow.fullName.split(" ")[0]} →` : "None"}
            subColor="#B83128"
            value={atRiskRows.length}
            valueColor="#B83128"
          />
          <ManagerStatColumn
            href="/manager?section=inbox"
            label="Cert sign-offs"
            sub="awaiting sign-off"
            subColor="#CC27B0"
            value={pendingCertCount}
            valueColor="#CC27B0"
          />
        </div>
      </ManagerBentoGrid>

      <ReadinessHeatmapGrid
        approvedCertCountByUser={approvedCertCountByUser}
        challengeTotalByUser={challengeTotalByUser}
        coachingByUser={coachingByUser}
        onSelectProfile={onSelectProfile}
        plans={plans}
        reviewedChallengeCountByUser={reviewedChallengeCountByUser}
        rows={readinessRows}
      />

      <div className="grid gap-3" style={{ gridTemplateColumns: "58fr 42fr" }}>
        <div className="overflow-hidden border border-[#E2DFD9] bg-white">
          <div className="flex items-baseline gap-2 border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-[11px]">
            <span className="font-display text-[13px] font-bold text-[#0D0E12]">Leaderboard</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[#B0ADA8]">
              {quarter} · Weighted sim + submissions
            </span>
          </div>
          <TeamLeaderboard embedded entries={leaderboardEntries} />
        </div>
        <ManagerRecentActivity activity={activity} profiles={profiles.length ? profiles : org} />
      </div>
    </div>
  );
}
