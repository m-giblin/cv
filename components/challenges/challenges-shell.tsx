"use client";

import { useMemo } from "react";
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

  const stats = useMemo(() => {
    const earned = new Set(
      submissions.filter((s) => s.status === "reviewed").map((s) => s.challengeId),
    ).size;
    // A resubmission adds a row, so count challenges rather than submissions.
    const inFlight = new Set(
      submissions.filter((s) => s.status === "submitted" || s.status === "in_progress").map((s) => s.challengeId),
    ).size;
    const submittedCount = submissions.filter(
      (s) => s.status === "submitted" || s.status === "reviewed",
    ).length;
    return { total: challenges.length, earned, inFlight, submittedCount };
  }, [challenges.length, submissions]);

  return (
    <PracticeToolPage
      actions={
        <ChallengesWorkspaceBar
          backHref={backHref}
          showGenerator={showGenerator}
          stats={stats}
          testMode={testMode}
          tier={tier}
        />
      }
      subtitle={`${stats.total} available. ${stats.earned} earned, ${stats.inFlight} in progress.`}
      testMode={testMode}
      title="Challenges"
    >
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
