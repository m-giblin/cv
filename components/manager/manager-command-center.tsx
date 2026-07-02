"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ActivityFeed } from "@/components/activity-feed";
import { ManagerActionInbox } from "@/components/manager/manager-action-inbox";
import { ManagerAlertStrip } from "@/components/manager/manager-alert-strip";
import {
  ManagerSeDetailPanel,
  type SeManagerSnapshot,
} from "@/components/manager/manager-se-detail-panel";
import { ManagerTeamRoster } from "@/components/manager/manager-team-roster";
import { ManagerTeamTable } from "@/components/manager/manager-team-table";
import { ManagerReviewHistory, type ReviewHistoryEntry } from "@/components/manager/manager-review-history";
import { SimulationAssignForm } from "@/components/manager/simulation-assign-form";
import type { PlanStepReviewItem } from "@/components/manager/plan-step-review-panel";
import type { ReviewItem } from "@/components/manager/review-queue";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { ActivityLog, Challenge, Profile, UserPlan } from "@/lib/types";

export function ManagerCommandCenter({
  reviewCount,
  pendingCertCount = 0,
  teamSize,
  averageProgress,
  reviewItems,
  planSteps,
  org,
  plans,
  openReviewsByUser,
  assignees,
  activity,
  profiles,
  reviewHistory,
  seSnapshots,
  coachingByUser,
  challenges,
}: {
  reviewCount: number;
  pendingCertCount?: number;
  teamSize: number;
  averageProgress: number;
  reviewItems: ReviewItem[];
  planSteps: PlanStepReviewItem[];
  org: Profile[];
  plans: UserPlan[];
  openReviewsByUser: Record<string, number>;
  assignees: Profile[];
  activity: ActivityLog[];
  profiles: Profile[];
  reviewHistory: ReviewHistoryEntry[];
  seSnapshots: SeManagerSnapshot[];
  coachingByUser: Record<string, SeCoachingSummary>;
  challenges: Challenge[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assignOpen, setAssignOpen] = useState(false);

  const selectedProfileId = searchParams.get("profile");

  const selectedSnapshot = useMemo(
    () => seSnapshots.find((snapshot) => snapshot.profile.id === selectedProfileId) ?? null,
    [seSnapshots, selectedProfileId],
  );

  const openProfile = useCallback(
    (profileId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("profile", profileId);
      router.push(`/manager?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const closeProfile = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("profile");
    const query = params.toString();
    router.push(query ? `/manager?${query}` : "/manager", { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-sp-magenta/15 bg-gradient-to-br from-sp-magenta/5 via-white to-sp-blue/5 px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-wider text-sp-magenta">Team overview</p>
        <h1 className="mt-1 text-2xl font-bold text-sp-navy">
          {reviewCount > 0 ? `${reviewCount} items need your review` : "Your team is on track"}
        </h1>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sp-navy-muted">
          <span>
            <strong className="text-sp-navy">{reviewCount}</strong> in inbox
          </span>
          <span>
            <strong className="text-sp-navy">{teamSize}</strong> SE{teamSize === 1 ? "" : "s"}
          </span>
          <span>
            <strong className="text-sp-navy">{averageProgress}%</strong> avg. plan progress
          </span>
          {pendingCertCount > 0 ? (
            <Link
              className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              href="/certifications"
            >
              {pendingCertCount} cert sign-off{pendingCertCount === 1 ? "" : "s"} pending
            </Link>
          ) : null}
        </p>
        <div className="mt-3">
          <ManagerAlertStrip />
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <ManagerActionInbox planSteps={planSteps} reviewItems={reviewItems} />
          <ManagerReviewHistory entries={reviewHistory} />
        </div>

        <aside className="space-y-4 xl:col-span-5 xl:sticky xl:top-6">
          <ManagerTeamRoster
            coachingByUser={coachingByUser}
            onSelectProfile={openProfile}
            org={org}
            plans={plans}
            selectedProfileId={selectedProfileId}
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent activity</CardTitle>
              <CardDescription>Latest progress across your org.</CardDescription>
            </CardHeader>
            <ActivityFeed activity={activity.slice(0, 5)} profiles={profiles} />
          </Card>
        </aside>
      </div>

      <ManagerTeamTable
        coachingByUser={coachingByUser}
        onSelectProfile={openProfile}
        org={org}
        plans={plans}
        selectedProfileId={selectedProfileId}
      />

      <div className="rounded-2xl border border-sp-blue/10 bg-white">
        <button
          className="flex w-full items-center justify-between px-5 py-4 text-left"
          onClick={() => setAssignOpen((open) => !open)}
          type="button"
        >
          <div>
            <p className="font-bold text-sp-navy">Assign simulation</p>
            <p className="text-sm text-sp-navy-muted">
              Push practice to an SE — collapsed by default so reviews stay first.
            </p>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-sp-navy-muted transition ${assignOpen ? "rotate-180" : ""}`}
          />
        </button>
        {assignOpen ? (
          <div className="border-t border-sp-blue/10 p-4 pt-0">
            <SimulationAssignForm assignees={assignees} />
          </div>
        ) : null}
      </div>

      {selectedSnapshot ? (
        <ManagerSeDetailPanel
          challenges={challenges}
          onClose={closeProfile}
          profiles={profiles}
          snapshot={selectedSnapshot}
        />
      ) : null}
    </div>
  );
}
