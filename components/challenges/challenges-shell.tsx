"use client";

import { useMemo, useState } from "react";
import { ChallengesPortal } from "@/components/challenges/challenges-portal";
import { ChallengesWorkspaceBar } from "@/components/challenges/challenges-workspace-bar";
import { PracticeToolPage } from "@/components/practice/practice-tool-page";
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
  const backHref = "/practice";
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
    <PracticeToolPage subtitle="Hands-on work, reviewed by your manager." testMode={testMode} title="Challenges">
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
        <p className="rounded-[10px] bg-blue-soft px-4 py-3 text-sm leading-[1.5] text-ink-2" id="challenges-help">
          Browse curated field scenarios, upload evidence, and submit for manager review. Challenges
          matching your competency gaps are sorted first.
        </p>
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
    </PracticeToolPage>
  );
}
