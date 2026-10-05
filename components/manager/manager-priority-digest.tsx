"use client";

import { useEffect, useState } from "react";
import { ManagerOutlineBtn } from "@/components/manager/manager-ui-primitives";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import type { Profile } from "@/lib/types";
import { initials } from "@/lib/utils";

type ReadinessPriority = { userId: string; firstName: string; dim: string; desc: string };

const HEALTH_WEIGHT: Record<SeCoachingSummary["health"], number> = {
  coach_now: 40,
  at_risk: 35,
  stalled: 25,
  waiting_on_se: 10,
  on_track: 0,
};

const HEALTH_REASON: Partial<Record<SeCoachingSummary["health"], string>> = {
  coach_now: "Needs coaching now",
  at_risk: "At risk — health flagged",
  stalled: "Stalled — no recent activity",
};

/**
 * One ranked "who needs you" list — merges signals that today live in three
 * separate places (Inbox counts, coaching health, Readiness Map priorities)
 * instead of making a manager check all three to find the same answer.
 * No new scoring model: reuses coachingByUser (already computed) and the
 * Readiness Map's own already-computed `priorities` array.
 */
export function ManagerPriorityDigest({
  org,
  coachingByUser,
  onSelectProfile,
}: {
  org: Profile[];
  coachingByUser: Record<string, SeCoachingSummary>;
  onSelectProfile?: (profileId: string) => void;
}) {
  const [priorities, setPriorities] = useState<ReadinessPriority[]>([]);

  useEffect(() => {
    void fetch("/api/manager/readiness-map")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { priorities?: ReadinessPriority[] } | null) => {
        if (body?.priorities) setPriorities(body.priorities);
      })
      .catch(() => undefined);
  }, []);

  const priorityByUser = new Map(priorities.map((p) => [p.userId, p]));

  const ranked = org
    .map((profile) => {
      const coaching = coachingByUser[profile.id];
      const readinessPriority = priorityByUser.get(profile.id);
      const inboxScore = (coaching?.openReviewCount ?? 0) * 6;
      const healthScore = coaching ? HEALTH_WEIGHT[coaching.health] : 0;
      const readinessScore = readinessPriority ? 20 : 0;
      const score = inboxScore + healthScore + readinessScore;

      const reason =
        (coaching?.openReviewCount ?? 0) > 0
          ? `${coaching!.openReviewCount} pending review${coaching!.openReviewCount === 1 ? "" : "s"}`
          : (coaching && HEALTH_REASON[coaching.health]) ||
            (readinessPriority ? `${readinessPriority.dim}: ${readinessPriority.desc}` : null);

      return { profile, score, reason };
    })
    .filter((row) => row.score > 0 && row.reason)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (ranked.length === 0) return null;

  return (
    <div className="border border-[#E2DFD9] bg-white">
      <div className="flex items-center justify-between border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-[11px]">
        <div>
          <span className="font-display text-[13px] font-bold text-[#0D0E12]">Who needs you first</span>
          <span className="ml-2 font-mono text-[7.5px] uppercase tracking-[0.1em] text-[#B0ADA8]">
            Inbox + coaching health + readiness, ranked
          </span>
        </div>
      </div>
      <div>
        {ranked.map((row) => (
          <button
            className="flex w-full items-center gap-3 border-b border-[#F2F0EC] px-4 py-2.5 text-left transition last:border-b-0 hover:bg-[#F0EFEB]"
            key={row.profile.id}
            onClick={() => onSelectProfile?.(row.profile.id)}
            type="button"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-medium text-white"
              style={{ background: avatarGradientForId(row.profile.id) }}
            >
              {initials(row.profile.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[#0D0E12]">{row.profile.fullName}</p>
              <p className="truncate text-[11px] text-[#6B6860]">{row.reason}</p>
            </div>
            <ManagerOutlineBtn href={`/manager?section=inbox`}>Review →</ManagerOutlineBtn>
          </button>
        ))}
      </div>
    </div>
  );
}
