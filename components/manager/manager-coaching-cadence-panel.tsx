"use client";

import { toast } from "sonner";
import { SP_BLUE_BTN, SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { healthBadgeStyle } from "@/components/manager/manager-ui-primitives";
import type { CoachingCadenceRow } from "@/lib/manager/coaching-cadence";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import type { Profile, UserPlan } from "@/lib/types";
import { initials } from "@/lib/utils";

function formatLast1on1(days: number | null) {
  if (days === null) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function ManagerCoachingCadencePanel({
  rows,
  coachingByUser = {},
  plans = [],
  org = [],
  onSelectSe,
}: {
  rows: CoachingCadenceRow[];
  coachingByUser?: Record<string, SeCoachingSummary>;
  plans?: UserPlan[];
  org?: Profile[];
  onSelectSe?: (profileId: string) => void;
}) {
  const levelById = Object.fromEntries(org.map((profile) => [profile.id, profile.level]));

  function copyBrief(row: CoachingCadenceRow) {
    const coaching = coachingByUser[row.profileId];
    const points = coaching?.talkingPoints ?? [];
    const text = [
      `1:1 brief — ${row.fullName}`,
      coaching?.storyLine ?? "",
      "",
      "Talking points:",
      ...points.map((point) => `• ${point}`),
    ].join("\n");
    void navigator.clipboard.writeText(text);
    toast.success("1:1 brief copied to clipboard");
  }

  function schedule1on1(row: CoachingCadenceRow) {
    const profile = org.find((item) => item.id === row.profileId);
    if (profile?.email) {
      const subject = encodeURIComponent(`1:1 — ${row.fullName}`);
      window.location.href = `mailto:${profile.email}?subject=${subject}`;
      return;
    }
    toast.info("Calendar integration coming soon");
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[#e2eaf5] bg-white p-[16px_18px]">
        <p className="text-[12.5px] font-bold text-[#0a1628]">Coaching cadence</p>
        <p className="mt-2 text-[11.5px] text-[#64748b]">No SEs need coaching touchpoints right now.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {rows.map((row) => {
        const coaching = coachingByUser[row.profileId];
        const plan = plans.find((item) => item.userId === row.profileId);
        const ramp = plan?.progress ?? coaching?.onboardingProgress ?? 0;
        const simAvg = coaching?.latestSimScore ?? coaching?.avgSimScore ?? "—";
        const health = coaching ? healthBadgeStyle(coaching.health) : healthBadgeStyle("on_track");
        const points = coaching?.talkingPoints ?? [];

        return (
          <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white" key={row.profileId}>
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                  style={{ background: avatarGradientForId(row.profileId) }}
                >
                  {initials(row.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <button
                      className="text-left text-[13px] font-bold text-[#0a1628] hover:underline"
                      onClick={() => onSelectSe?.(row.profileId)}
                      type="button"
                    >
                      {row.fullName}
                    </button>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                      style={{ background: health.bg, color: health.color }}
                    >
                      {health.label}
                    </span>
                    <span className="text-[10px] capitalize text-[#94a3b8]">{levelById[row.profileId] ?? "SE"}</span>
                  </div>
                  <p className="text-[11px] text-[#64748b]">
                    Last 1:1: {formatLast1on1(row.daysSinceCoaching)} · Sim avg: {simAvg} · Ramp: {ramp}%
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
                <button className={SP_OUTLINE_BTN} onClick={() => copyBrief(row)} type="button">
                  Copy 1:1 brief
                </button>
                <button className={SP_BLUE_BTN} onClick={() => schedule1on1(row)} type="button">
                  Schedule 1:1 →
                </button>
              </div>
            </div>

            {points.length > 0 ? (
              <div className="border-t border-[#f1f5f9] bg-[#f8fafd] p-[12px_18px_14px]">
                <p className="mb-[7px] text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]">
                  AI 1:1 talking points
                </p>
                <div className="space-y-[5px]">
                  {points.slice(0, 4).map((point) => (
                    <div className="flex items-start gap-[7px]" key={point}>
                      <span className="mt-[1px] shrink-0 text-[11px] text-[#0071ce]">•</span>
                      <span className="text-[11.5px] leading-[1.5] text-[#374151]">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
