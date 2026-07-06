"use client";

import { FileUp } from "lucide-react";
import { useState } from "react";
import { ChallengeLibrary } from "@/components/challenges/challenge-library";
import { ChallengeSubmissionForm } from "@/components/challenges/submission-form";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Challenge, ChallengeSubmission } from "@/lib/types";

export function ChallengesWorkspace({
  challenges,
  submissions,
  initialChallengeId,
  isFocused,
  tier,
}: {
  challenges: Challenge[];
  submissions: ChallengeSubmission[];
  initialChallengeId: string | null;
  isFocused: boolean;
  tier: "se" | "manager" | "admin";
}) {
  const [activeChallengeId, setActiveChallengeId] = useState(initialChallengeId);

  const activeChallenge = challenges.find((challenge) => challenge.id === activeChallengeId) ?? null;

  const earnedTrophyChallengeIds = new Set(
    submissions.filter((s) => s.status === "reviewed").map((s) => s.challengeId),
  );

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Challenge library</CardTitle>
          <CardDescription>
            {tier === "se"
              ? "Browse curated practice. Use cards or list view — click any challenge for full steps and success criteria."
              : "Curated and AI-generated challenges can be assigned directly or embedded in plan steps."}
          </CardDescription>
        </CardHeader>
        <ChallengeLibrary
          activeChallengeId={activeChallengeId}
          challenges={challenges}
          earnedTrophyChallengeIds={earnedTrophyChallengeIds}
          onSelectChallenge={setActiveChallengeId}
          submissions={submissions}
        />
      </Card>

      <Card className={isFocused ? "ring-2 ring-sp-magenta/30" : undefined}>
        <CardHeader>
          <CardTitle>Submit for review</CardTitle>
          <CardDescription>
            Add an evidence link and reflection. Your manager receives a notification when you submit.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          {activeChallenge ? (
            <>
              <div className="rounded-2xl border border-sp-blue/15 bg-sp-blue-soft/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sp-blue">Active challenge</p>
                <p className="mt-1 text-sm font-bold text-sp-navy">{activeChallenge.title}</p>
                <p className="mt-2 text-xs text-sp-navy-muted">
                  Pick a different challenge from the library anytime before you submit.
                </p>
              </div>
              <ChallengeSubmissionForm challengeId={activeChallenge.id} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-sp-blue/25 bg-sp-blue-soft/30 p-5 text-center">
              <FileUp className="mx-auto h-8 w-8 text-sp-blue" />
              <p className="mt-3 text-sm font-semibold text-sp-navy">Select a challenge to submit</p>
              <p className="mt-1 text-xs text-sp-navy-muted">
                Open the library, click a challenge, then choose &quot;Work on this challenge.&quot;
              </p>
            </div>
          )}

          {submissions.length > 0 ? (
            <div className="space-y-3 border-t border-sp-blue/10 pt-4">
              <p className="text-sm font-semibold text-sp-navy">Your submissions</p>
              {submissions.map((submission) => {
                const challenge = challenges.find((item) => item.id === submission.challengeId);

                return (
                  <button
                    className="w-full rounded-2xl border border-sp-blue/10 p-4 text-left transition hover:border-sp-blue/25 hover:bg-sp-blue-soft/10"
                    key={submission.id}
                    onClick={() => challenge && setActiveChallengeId(challenge.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-sp-navy">{challenge?.title ?? "Challenge"}</p>
                        <p className="mt-1 text-xs text-sp-navy-muted">
                          Submitted{" "}
                          {submission.submittedAt
                            ? new Date(submission.submittedAt).toLocaleDateString()
                            : "recently"}
                        </p>
                        {submission.managerFeedback && submission.status === "in_progress" ? (
                          <p className="mt-2 text-xs text-amber-800">Manager sent this back for more work</p>
                        ) : null}
                      </div>
                      <StatusBadge status={submission.status} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
