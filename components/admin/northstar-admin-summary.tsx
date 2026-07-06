"use client";

import { SailPointLogoMark } from "@/components/shell/sailpoint-logo-mark";
import { formatTokenCount, type AiUsageSummary } from "@/lib/ai/settings-shared";
import { getAccessTier } from "@/lib/auth/rbac";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import type { ActivityLog, Profile, UserPlan } from "@/lib/types";
import { initials } from "@/lib/utils";

type PendingReviewBreakdown = {
  challengeSubmissions: number;
  simulationCards: number;
  planStepReviews: number;
  certSignoffs: number;
};

function pendingBreakdownFromPlans(plans: UserPlan[]): PendingReviewBreakdown {
  const counts: PendingReviewBreakdown = {
    challengeSubmissions: 0,
    simulationCards: 0,
    planStepReviews: 0,
    certSignoffs: 0,
  };

  for (const plan of plans) {
    for (const step of plan.steps) {
      if (step.status !== "submitted" && step.status !== "under_review") {
        continue;
      }

      if (step.type === "challenge") {
        counts.challengeSubmissions += 1;
      } else if (step.type === "simulation") {
        counts.simulationCards += 1;
      } else {
        counts.planStepReviews += 1;
      }
    }
  }

  return counts;
}

function planProgress(plan: UserPlan): number {
  if (plan.steps.length === 0) return 0;
  const done = plan.steps.filter((s) => s.status === "reviewed").length;
  return Math.round((done / plan.steps.length) * 100);
}

const AI_DOT_COLORS: Record<string, string> = {
  simulation_turn: "#0071ce",
  deal_prep: "#7c3aed",
  coaching_card: "#10b981",
  challenge: "#f59e0b",
  isc_lab: "#cc27b0",
};

function activityTypeBadge(eventType: ActivityLog["eventType"]) {
  const map: Record<ActivityLog["eventType"], { type: string; typeBg: string; typeColor: string }> = {
    plan_step_completed: { type: "Plan", typeBg: "#e8f2fc", typeColor: "#0057a8" },
    challenge_submitted: { type: "Challenge", typeBg: "#fef3c7", typeColor: "#b45309" },
    simulation_completed: { type: "Sim", typeBg: "#fdf0fa", typeColor: "#a51e8e" },
    coaching_card_reviewed: { type: "AI", typeBg: "#ede9fe", typeColor: "#5b21b6" },
    manager_feedback_received: { type: "Admin", typeBg: "#f1f5f9", typeColor: "#64748b" },
    plan_assigned: { type: "Plan", typeBg: "#e8f2fc", typeColor: "#0057a8" },
    deal_prep_completed: { type: "AI", typeBg: "#ede9fe", typeColor: "#5b21b6" },
  };
  return map[eventType] ?? { type: "User", typeBg: "#dbeafe", typeColor: "#1d4ed8" };
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NorthstarAdminSummary({
  profiles,
  plans,
  activity,
  pendingReviews,
  pendingReviewBreakdown,
  aiUsage,
  onViewAudit,
}: {
  profiles: Profile[];
  plans: UserPlan[];
  activity: ActivityLog[];
  pendingReviews: number;
  pendingReviewBreakdown?: PendingReviewBreakdown;
  aiUsage: AiUsageSummary | null;
  onViewAudit?: () => void;
}) {
  const seCount = profiles.filter((p) => getAccessTier(p.role) === "se").length;
  const activePlans = plans.filter((p) => p.status !== "completed");
  const completedPlans = plans.filter((p) => p.status === "completed");
  const avgProgress =
    activePlans.length > 0
      ? Math.round(activePlans.reduce((sum, plan) => sum + planProgress(plan), 0) / activePlans.length)
      : 0;

  const avgTimeToReady =
    completedPlans.length > 0
      ? Math.round(
          completedPlans.reduce((sum, plan) => {
            const start = new Date(plan.startDate).getTime();
            const end = plan.targetCompletion ? new Date(plan.targetCompletion).getTime() : Date.now();
            return sum + Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
          }, 0) / completedPlans.length,
        )
      : 0;

  const completionRate =
    plans.length > 0 ? Math.round((completedPlans.length / plans.length) * 100) : 0;
  const gateClearance =
    profiles.length > 0
      ? Math.min(100, Math.round((completedPlans.length / Math.max(activePlans.length, 1)) * 100))
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

  const aiUsageRows =
    usage.byFeature.length > 0
      ? usage.byFeature.slice(0, 4).map((item) => ({
          label: item.label,
          count: item.count.toLocaleString(),
          sub: `${formatTokenCount(item.tokens)} tokens`,
          dot: AI_DOT_COLORS[item.feature] ?? "#0071ce",
        }))
      : [
          { label: "Simulations", count: "0", sub: "30d requests", dot: "#0071ce" },
          { label: "Deal prep briefs", count: "0", sub: "30d requests", dot: "#7c3aed" },
          { label: "Coaching cards", count: "0", sub: "30d requests", dot: "#10b981" },
          { label: "Market pulse", count: "0", sub: "30d requests", dot: "#f59e0b" },
        ];

  const reviewCounts = pendingReviewBreakdown ?? pendingBreakdownFromPlans(plans);

  const breakdown = [
    {
      label: "Challenge submissions",
      count: reviewCounts.challengeSubmissions,
      color: "#f59e0b",
    },
    {
      label: "Simulation cards",
      count: reviewCounts.simulationCards,
      color: "#7c3aed",
    },
    {
      label: "Plan step reviews",
      count: reviewCounts.planStepReviews,
      color: "#0071ce",
    },
    {
      label: "Cert sign-offs",
      count: reviewCounts.certSignoffs,
      color: "#cc27b0",
    },
  ];
  const totalPending = breakdown.reduce((sum, item) => sum + item.count, 0);

  const recentActivity = activity.slice(0, 8);

  const heroKpis = [
    { value: profiles.length, label: "Total users", color: "text-white" },
    { value: seCount, label: "Active SEs", color: "text-[#60a5fa]" },
    { value: pendingReviews, label: "Pending reviews", color: "text-[#f59e0b]" },
    { value: `${avgProgress}%`, label: "Avg plan progress", color: "text-[#34d399]" },
    { value: avgTimeToReady > 0 ? `${avgTimeToReady}d` : "—", label: "Avg time to ready", color: "text-[#c084fc]" },
    { value: `${gateClearance}%`, label: "Gate clearance", color: "text-[#fb923c]" },
  ];

  return (
    <div className="animate-[fadeUp_0.2s_ease-out] space-y-[14px]">
      <div
        className="relative mb-[14px] overflow-hidden rounded-2xl p-[20px_24px]"
        style={{ background: "linear-gradient(145deg,#001228,#002060 60%,#002e80)" }}
      >
        <div
          className="pointer-events-none absolute -right-[20px] -top-[40px] h-[200px] w-[200px] rounded-full"
          style={{ background: "rgba(204,39,176,0.08)" }}
        />

        <div className="mb-[10px] flex items-center gap-[8px]">
          <SailPointLogoMark className="h-[22px] w-[22px]" variant="flat-white" />
          <span className="font-display text-[13px] font-extrabold tracking-[-0.01em] text-white/90">SailPoint</span>
          <div className="h-[14px] w-px bg-white/20" />
          <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-white/40">
            Platform overview · FY2026 Q2
          </span>
        </div>

        <h1 className="mb-[12px] font-display text-[19px] font-extrabold tracking-[-0.02em] text-white">
          Administration Console
        </h1>

        <div className="flex flex-wrap gap-[14px]">
          {heroKpis.map((kpi) => (
            <div
              className="rounded-[10px] px-[18px] py-[12px] text-center"
              key={kpi.label}
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <p className={`font-display text-[26px] font-extrabold leading-none ${kpi.color}`}>{kpi.value}</p>
              <p className="mt-[3px] text-[9.5px] text-white/42">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
        <div className="rounded-xl border border-[#e2eaf5] bg-white p-[16px_18px]">
          <p className="mb-[12px] text-[12.5px] font-bold text-[#0a1628]">Program health</p>
          <div className="space-y-[10px]">
            {[
              { label: "Plan completion rate", pct: completionRate, color: "#0071ce", trackBg: "#e8f2fc" },
              { label: "Avg plan progress", pct: avgProgress, color: "#0071ce", trackBg: "#e8f2fc" },
              { label: "Gate clearance rate", pct: gateClearance, color: "#cc27b0", trackBg: "#fdf0fa" },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="mb-[4px] flex justify-between">
                  <span className="text-[11px] text-[#64748b]">{bar.label}</span>
                  <span className="text-[11px] font-bold" style={{ color: bar.color }}>
                    {bar.pct}%
                  </span>
                </div>
                <div className="h-[6px] overflow-hidden rounded-full" style={{ background: bar.trackBg }}>
                  <div className="prog-fill h-full rounded-full" style={{ width: `${bar.pct}%`, background: bar.color }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-[10px] text-[10.5px] text-[#94a3b8]">
            {completedPlans.length} completed · {activePlans.length} active plans
          </p>
        </div>

        <div className="rounded-xl border border-[#e2eaf5] bg-white p-[16px_18px]">
          <div className="mb-[12px] flex items-center justify-between">
            <p className="text-[12.5px] font-bold text-[#0a1628]">AI usage · this month</p>
            <span className="rounded-full bg-[#dcfce7] px-[8px] py-[2px] text-[9.5px] font-bold text-[#15803d]">
              Healthy
            </span>
          </div>
          <div className="space-y-[9px]">
            {aiUsageRows.map((item) => (
              <div
                className="flex items-center justify-between rounded-lg border border-[#f1f5f9] bg-[#f8fafd] px-[10px] py-[8px]"
                key={item.label}
              >
                <div className="flex items-center gap-[8px]">
                  <span className="h-[6px] w-[6px] flex-shrink-0 rounded-full" style={{ background: item.dot }} />
                  <span className="text-[11.5px] text-[#475569]">{item.label}</span>
                </div>
                <div className="text-right">
                  <p className="font-display text-[14px] font-extrabold leading-none text-[#0a1628]">{item.count}</p>
                  <p className="text-[9px] text-[#94a3b8]">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#e2eaf5] bg-white p-[16px_18px]">
          <div className="mb-[12px] flex items-center justify-between">
            <p className="text-[12.5px] font-bold text-[#0a1628]">Pending reviews</p>
            <span className="rounded-full bg-[#fef3c7] px-[8px] py-[2px] text-[9.5px] font-bold text-[#b45309]">
              {totalPending} total
            </span>
          </div>
          <div className="space-y-[7px]">
            {breakdown.map((item) => (
              <div className="flex items-center justify-between" key={item.label}>
                <div className="flex items-center gap-[7px]">
                  <span className="h-[8px] w-[8px] flex-shrink-0 rounded-sm" style={{ background: item.color }} />
                  <span className="text-[11.5px] text-[#475569]">{item.label}</span>
                </div>
                <span className="text-[12.5px] font-bold text-[#0a1628]">{item.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-[12px] flex h-[8px] gap-[2px] overflow-hidden rounded-full">
            {breakdown.map((item) => (
              <div
                className="h-full"
                key={item.label}
                style={{
                  width: totalPending > 0 ? `${(item.count / totalPending) * 100}%` : "0%",
                  background: item.color,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] p-[13px_18px]">
          <p className="text-[12.5px] font-bold text-[#0a1628]">Recent platform activity</p>
          <button
            className="inline-flex items-center rounded-md border border-[#e2eaf5] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#334155]"
            onClick={onViewAudit}
            type="button"
          >
            View audit log →
          </button>
        </div>
        {recentActivity.length === 0 ? (
          <p className="px-[18px] py-6 text-sm text-[#94a3b8]">No activity yet.</p>
        ) : (
          recentActivity.map((item) => {
            const actor = profiles.find((p) => p.id === item.userId);
            const badge = activityTypeBadge(item.eventType);
            const actorId = actor?.id ?? item.userId;
            return (
              <div
                className="flex items-center gap-[12px] border-b border-[#f9fafb] px-[18px] py-[9px] last:border-b-0"
                key={item.id}
              >
                <div
                  className="flex h-[28px] w-[28px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: avatarGradientForId(actorId) }}
                >
                  {initials(actor?.fullName ?? "User")}
                </div>
                <p className="flex-1 text-[11.5px]">
                  <span className="font-semibold text-[#1e293b]">{actor?.fullName ?? "User"}</span>{" "}
                  <span className="text-[#64748b]">{item.title}</span>
                </p>
                <span
                  className="flex-shrink-0 rounded-full px-[7px] py-[2px] text-[9.5px] font-bold"
                  style={{ background: badge.typeBg, color: badge.typeColor }}
                >
                  {badge.type}
                </span>
                <span className="flex-shrink-0 text-[10.5px] text-[#94a3b8]">{formatRelativeTime(item.createdAt)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
