"use client";

import { useMemo, useState } from "react";
import { ChallengesWorkspaceBar } from "@/components/challenges/challenges-workspace-bar";
import { ChallengesPortal } from "@/components/challenges/challenges-portal";
import type { AccessTier } from "@/lib/auth/rbac";
import type { GapChallengeRecommendation } from "@/lib/challenges/gap-recommendations";
import type { Challenge, ChallengeSubmission } from "@/lib/types";

export function ChallengesShell({
  tier,
  testMode,
  challenges,
  submissions,
  initialChallengeId,
  isFocused,
  showGenerator,
  gapRecommendations,
}: {
  tier: AccessTier;
  testMode: boolean;
  challenges: Challenge[];
  submissions: ChallengeSubmission[];
  initialChallengeId: string | null;
  isFocused: boolean;
  showGenerator: boolean;
  gapRecommendations: GapChallengeRecommendation[];
}) {
  const backHref = tier === "se" ? "/dashboard" : "/my-practice";
  const [showHelp, setShowHelp] = useState(false);

  const stats = useMemo(() => {
    const earned = new Set(
      submissions.filter((s) => s.status === "reviewed").map((s) => s.challengeId),
    ).size;
    const inFlight = submissions.filter(
      (s) => s.status === "submitted" || s.status === "in_progress",
    ).length;
    const submittedCount = submissions.filter(
      (s) => s.status === "submitted" || s.status === "reviewed",
    ).length;
    return { total: challenges.length, earned, inFlight, submittedCount };
  }, [challenges.length, submissions]);

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col bg-[#F5F4F0]">
      <ChallengesWorkspaceBar
        backHref={backHref}
        onToggleHelp={() => setShowHelp((open) => !open)}
        showGenerator={showGenerator}
        showHelp={showHelp}
        stats={stats}
        testMode={testMode}
        tier={tier}
      />
      {showHelp ? (
        <div className="shrink-0 border-b border-[#0071CE]/15 bg-[#EEF4FF]/60 px-5 py-2.5 text-[11px] leading-relaxed text-[#3D3C38]">
          Browse curated field scenarios, upload evidence, and submit for manager review. Challenges
          matching your competency gaps are sorted first.
        </div>
      ) : null}
      <ChallengesPortal
        challenges={challenges}
        gapRecommendations={gapRecommendations}
        initialChallengeId={initialChallengeId}
        isFocused={isFocused}
        showGenerator={showGenerator}
        submissions={submissions}
        tier={tier === "admin" || tier === "manager" || tier === "se" ? tier : "admin"}
      />
    </div>
  );
}
