"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminBentoGrid,
  AdminOutlineBtn,
  AdminStatColumn,
} from "@/components/admin/admin-ui-primitives";
import { buildFeatureFlagCategorySummary } from "@/lib/admin/feature-flag-summary";
import { formatTokenCount, type AiUsageSummary } from "@/lib/ai/settings-shared";
import { getAccessTier } from "@/lib/auth/rbac";
import type { PendingReviewBreakdown } from "@/lib/data/get-pending-review-breakdown";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import type { ActivityLog, Profile, UserPlan } from "@/lib/types";

const ACTIVITY_BAR_DEFS: Array<{
  eventTypes: ActivityLog["eventType"][];
  label: string;
  color: string;
}> = [
  { eventTypes: ["simulation_completed"], label: "Simulations run", color: "#CC27B0" },
  { eventTypes: ["challenge_submitted"], label: "Challenges submitted", color: "#7c3aed" },
  { eventTypes: ["deal_prep_completed"], label: "Deal prep briefs", color: "#D4810A" },
  { eventTypes: ["flight_check_completed"], label: "Market Pulse quizzes", color: "#0071CE" },
  { eventTypes: ["coaching_card_reviewed", "pitch_submitted"], label: "Coaching & pitch", color: "#0A6E45" },
];

function planProgress(plan: UserPlan): number {
  if (plan.steps.length === 0) return 0;
  const done = plan.steps.filter((s) => s.status === "reviewed").length;
  return Math.round((done / plan.steps.length) * 100);
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "Yesterday" : `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function eventDotColor(eventType: ActivityLog["eventType"]) {
  switch (eventType) {
    case "challenge_submitted":
      return "#7c3aed";
    case "simulation_completed":
      return "#CC27B0";
    case "coaching_card_reviewed":
      return "#B83128";
    case "plan_assigned":
    case "plan_step_completed":
      return "#0071CE";
    case "deal_prep_completed":
      return "#D4810A";
    default:
      return "#0A6E45";
  }
}

export function NorthstarAdminSummary({
  profiles,
  plans,
  activity,
  pendingReviews,
  pendingReviewBreakdown,
  aiUsage,
}: {
  profiles: Profile[];
  plans: UserPlan[];
  activity: ActivityLog[];
  pendingReviews: number;
  pendingReviewBreakdown?: PendingReviewBreakdown;
  aiUsage: AiUsageSummary | null;
}) {
  const [featureFlags, setFeatureFlags] = useState<PlatformFeatureFlags | null>(null);

  const loadFlags = useCallback(async () => {
    const response = await fetch("/api/admin/platform-settings");
    if (!response.ok) return;
    const body = (await response.json()) as { settings: { featureFlags: PlatformFeatureFlags } };
    setFeatureFlags(body.settings.featureFlags);
  }, []);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  const seProfiles = profiles.filter((p) => getAccessTier(p.role) === "se");
  const onboardingCount = plans.filter((p) => p.status === "in_progress").length;
  const activePlans = plans.filter((p) => p.status !== "completed");
  const avgProgress =
    activePlans.length > 0
      ? Math.round(activePlans.reduce((sum, plan) => sum + planProgress(plan), 0) / activePlans.length)
      : 0;

  const usage = aiUsage ?? {
    requests30d: 0,
    requestsToday: 0,
    tokens30d: 0,
    tokensToday: 0,
    model: "Not configured",
    provider: "xai" as const,
    byFeature: [],
  };

  const reviewCounts = pendingReviewBreakdown ?? {
    challengeSubmissions: 0,
    simulationCards: 0,
    planStepReviews: 0,
    certSignoffs: 0,
  };
  const totalPending = Object.values(reviewCounts).reduce((sum, n) => sum + n, 0);
  const heroPending = pendingReviewBreakdown ? totalPending : pendingReviews;

  const healthStats = [
    {
      label: "Active SEs",
      value: String(seProfiles.length),
      sub: `${onboardingCount} in onboarding`,
      valueColor: "#0D0E12",
    },
    {
      label: "Open reviews",
      value: String(heroPending),
      sub: "Challenges + sims",
      valueColor: "#D4810A",
    },
    {
      label: "Avg plan progress",
      value: `${avgProgress}%`,
      sub: `${activePlans.length} active plans`,
      valueColor: "#0071CE",
    },
    {
      label: "Plans active",
      value: String(activePlans.length),
      sub: `${plans.filter((p) => p.status === "completed").length} completed`,
      valueColor: "#0D0E12",
    },
    {
      label: "AI requests",
      value: String(usage.requests30d),
      sub: "30 days",
      valueColor: "#7c3aed",
    },
  ];

  const activityCounts = useMemo(() => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = activity.filter((item) => new Date(item.createdAt).getTime() >= since);
    return ACTIVITY_BAR_DEFS.map((def) => ({
      ...def,
      value: recent.filter((item) => def.eventTypes.includes(item.eventType)).length,
    }));
  }, [activity]);

  const maxActivity = Math.max(1, ...activityCounts.map((row) => row.value));

  const recentEvents = useMemo(
    () =>
      [...activity]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((item) => {
          const person = profiles.find((p) => p.id === item.userId);
          return {
            text: `${person?.fullName?.split(" ")[0] ?? "User"} — ${item.title}`,
            time: formatRelativeTime(item.createdAt),
            dotColor: eventDotColor(item.eventType),
          };
        }),
    [activity, profiles],
  );

  const pendingQueue = useMemo(() => {
    const items: Array<{
      id: string;
      accentColor: string;
      tagBg: string;
      tagColor: string;
      type: string;
      title: string;
      person: string;
      time: string;
    }> = [];

    if (reviewCounts.challengeSubmissions > 0) {
      items.push({
        id: "chal",
        accentColor: "#7c3aed",
        tagBg: "#EDE9FE",
        tagColor: "#5b21b6",
        type: "CHALLENGE",
        title: `${reviewCounts.challengeSubmissions} challenge submission${reviewCounts.challengeSubmissions === 1 ? "" : "s"}`,
        person: "Team",
        time: "Pending",
      });
    }
    if (reviewCounts.simulationCards > 0) {
      items.push({
        id: "sim",
        accentColor: "#CC27B0",
        tagBg: "#FDF0FA",
        tagColor: "#A51E8E",
        type: "SIM CARD",
        title: `${reviewCounts.simulationCards} sim card${reviewCounts.simulationCards === 1 ? "" : "s"}`,
        person: "Team",
        time: "Pending",
      });
    }
    if (reviewCounts.certSignoffs > 0) {
      items.push({
        id: "cert",
        accentColor: "#0A6E45",
        tagBg: "#EDFAF3",
        tagColor: "#0A6E45",
        type: "CERT GATE",
        title: `${reviewCounts.certSignoffs} cert sign-off${reviewCounts.certSignoffs === 1 ? "" : "s"}`,
        person: "Team",
        time: "Pending",
      });
    }
    if (reviewCounts.planStepReviews > 0) {
      items.push({
        id: "plan",
        accentColor: "#0071CE",
        tagBg: "#EEF4FF",
        tagColor: "#1D4ED8",
        type: "PLAN STEP",
        title: `${reviewCounts.planStepReviews} plan step${reviewCounts.planStepReviews === 1 ? "" : "s"}`,
        person: "Team",
        time: "Pending",
      });
    }

    return items.slice(0, 4);
  }, [reviewCounts]);

  const flagSummary = buildFeatureFlagCategorySummary(featureFlags);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-px border border-[#E2DFD9] bg-[#E2DFD9]">
        {healthStats.map((stat) => (
          <div className="bg-white px-4 py-[13px]" key={stat.label}>
            <div
              className="mb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8]"
              style={stat.valueColor === "#D4810A" ? { color: "#D4810A" } : undefined}
            >
              {stat.label}
            </div>
            <div
              className="font-mono text-[34px] font-normal leading-none tracking-[-0.02em]"
              style={{ color: stat.valueColor }}
            >
              {stat.value}
            </div>
            <div className="mt-1 font-mono text-[8.5px] text-[#A09D98]">{stat.sub}</div>
          </div>
        ))}
      </div>

      <AdminBentoGrid columns="55fr 26fr 19fr">
        <div className="bg-white px-[18px] py-4">
          <div className="mb-3.5 flex items-baseline justify-between">
            <span className="font-display text-[13.5px] font-bold text-[#0D0E12]">Platform activity</span>
            <span className="font-mono text-[8.5px] text-[#B0ADA8]">Last 30 days</span>
          </div>
          {activityCounts.map((row) => (
            <div className="mb-[11px] last:mb-0" key={row.label}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[11.5px] font-medium text-[#3D3C38]">{row.label}</span>
                <span className="font-mono text-[13px] font-medium" style={{ color: row.color }}>
                  {row.value}
                </span>
              </div>
              <div className="relative h-[5px] bg-[#ECEAE6]">
                <div
                  className="prog-fill absolute left-0 top-0 h-full"
                  style={{
                    width: `${Math.round((row.value / maxActivity) * 100)}%`,
                    background: row.color,
                  }}
                />
              </div>
            </div>
          ))}
          <div className="mt-4 border-t border-[#F2F0EC] pt-3">
            <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#B0ADA8]">
              Recent events
            </div>
            {recentEvents.length === 0 ? (
              <p className="text-[11px] text-[#A09D98]">No recent events.</p>
            ) : (
              recentEvents.map((event, index) => (
                <div
                  className="flex items-center gap-2 border-b border-[#F9F8F6] py-1.5 last:border-b-0"
                  key={`${event.text}-${index}`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: event.dotColor }} />
                  <span className="flex-1 text-[11px] text-[#3D3C38]">{event.text}</span>
                  <span className="shrink-0 font-mono text-[8.5px] text-[#B0ADA8]">{event.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white">
          <div className="flex items-baseline gap-2 border-b border-[#ECEAE6] px-[14px] py-3">
            <span className="font-display text-[13px] font-bold text-[#0D0E12]">Reviews</span>
            {heroPending > 0 ? (
              <span className="animate-pulse-dot font-mono text-[9px] font-medium text-[#D4810A]">
                ● {heroPending}
              </span>
            ) : null}
          </div>
          {pendingQueue.length === 0 ? (
            <p className="px-[14px] py-6 text-[11.5px] text-[#A09D98]">Review queue clear.</p>
          ) : (
            pendingQueue.map((item) => (
              <Link
                className="block border-b border-[#F2F0EC] px-[14px] py-2.5 transition hover:bg-[#F0EFEB]"
                href="/admin?tab=reviews"
                key={item.id}
                style={{ borderLeft: `2px solid ${item.accentColor}` }}
              >
                <span
                  className="mb-1 inline-block font-mono text-[8px] uppercase tracking-[0.09em] px-1.5 py-px"
                  style={{ background: item.tagBg, color: item.tagColor }}
                >
                  {item.type}
                </span>
                <p className="text-[11.5px] font-medium leading-snug text-[#0D0E12]">{item.title}</p>
                <p className="font-mono text-[8.5px] text-[#A09D98]">
                  {item.person} · {item.time}
                </p>
              </Link>
            ))
          )}
          <div className="p-2 px-[14px]">
            <AdminOutlineBtn className="w-full justify-center" href="/admin?tab=reviews">
              All {heroPending} reviews →
            </AdminOutlineBtn>
          </div>
        </div>

        <div className="bg-[#F9F8F6]">
          <div className="border-b border-[#ECEAE6] px-[14px] py-3">
            <span className="font-display text-[13px] font-bold text-[#0D0E12]">AI usage</span>
            <div className="mt-0.5 font-mono text-[8px] tracking-[0.06em] text-[#B0ADA8]">
              {usage.model} · {usage.provider}
            </div>
          </div>
          <AdminStatColumn label="Requests (30d)" sub="last 30 days" value={usage.requests30d} />
          <AdminStatColumn label="Today" sub="across all features" value={usage.requestsToday} />
          <AdminStatColumn label="Tokens (30d)" sub={usage.model} value={formatTokenCount(usage.tokens30d)} />
          <div className="p-2.5 px-[14px]">
            <AdminOutlineBtn className="w-full justify-center" href="/admin?tab=ai">
              AI settings →
            </AdminOutlineBtn>
          </div>
        </div>
      </AdminBentoGrid>

      <div className="overflow-hidden border border-[#E2DFD9] bg-white">
        <div className="flex items-baseline justify-between border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-[11px]">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[13px] font-bold text-[#0D0E12]">Feature flags</span>
            <span className="font-mono text-[8.5px] text-[#B0ADA8]">
              {flagSummary.enabledTotal} of {flagSummary.total} enabled
              {flagSummary.total - flagSummary.enabledTotal > 0
                ? ` · ${flagSummary.total - flagSummary.enabledTotal} disabled`
                : ""}
            </span>
          </div>
          <AdminOutlineBtn href="/admin?tab=settings&section=flags">
            Manage flags →
          </AdminOutlineBtn>
        </div>
        <div className="grid grid-cols-6 gap-px bg-[#E2DFD9]">
          {flagSummary.rows.map((row) => (
            <div className="bg-white px-3 py-2.5" key={row.category}>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[#B0ADA8]">
                  {row.category}
                </span>
                <span className="font-mono text-[9px] font-medium" style={{ color: row.color }}>
                  {row.enabled}/{row.total}
                </span>
              </div>
              <div className="relative h-[3px] bg-[#ECEAE6]">
                <div
                  className="prog-fill absolute left-0 top-0 h-full"
                  style={{ width: `${row.pct}%`, background: row.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
