"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CertReviewItem } from "@/components/manager/cert-review-item";
import { ManagerCohortView } from "@/components/manager/cohort-view";
import type { DealPrepReviewItem } from "@/components/manager/deal-prep-review-item";
import { ManagerAssignPlansSection } from "@/components/manager/manager-assign-plans-section";
import { ManagerCoachingCadencePanel } from "@/components/manager/manager-coaching-cadence-panel";
import { ManagerDevelopmentPlansPanel } from "@/components/manager/manager-development-plans-panel";
import { ManagerInbox } from "@/components/manager/manager-inbox";
import { ManagerLeaderboard } from "@/components/manager/manager-leaderboard";
import { ManagerMenteesPanel } from "@/components/manager/manager-mentees-panel";
import { ManagerProgramTrackerPanel } from "@/components/manager/manager-program-tracker-panel";
import { ManagerReviewHistory, type ReviewHistoryEntry } from "@/components/manager/manager-review-history";
import { ManagerSeDetailPanel, type SeManagerSnapshot } from "@/components/manager/manager-se-detail-panel";
import { ManagerTeamRoster } from "@/components/manager/manager-team-roster";
import { ManagerToday } from "@/components/manager/manager-today";
import type { PlanStepReviewItem } from "@/components/manager/plan-step-review-panel";
import type { ReviewItem } from "@/components/manager/review-queue";
import { TeamReadiness, type CompetencySeRow } from "@/components/manager/team-readiness";
import { SectionTabs } from "@/components/nav/section-tabs";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import type { MenteeAssignment } from "@/lib/data/fetch-mentor-mentees";
import type { LeaderboardEntry } from "@/lib/gamification/leaderboard";
import type { CoachingCadenceRow } from "@/lib/manager/coaching-cadence";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import type { TeamMember } from "@/lib/manager/team-status";
import type { ActivityLog, Challenge, DevelopmentPlan, Profile, ProfileRole, UserPlan } from "@/lib/types";

export type ManagerSection =
  | "command"
  | "inbox"
  | "roster"
  | "readiness"
  | "leaderboard"
  | "cadence"
  | "history"
  | "dev"
  | "program"
  | "assign"
  | "mentees";

function Body({ children }: { children: ReactNode }) {
  return <PageBody className="pb-8">{children}</PageBody>;
}

/** Team › Roster / Readiness / … text tabs (artboards 9b, 10b), shared by every Team page. */
export function TeamTabs({ flags }: { flags?: PlatformFeatureFlags }) {
  return (
    <PageBody className="pb-[22px]">
      <SectionTabs flags={flags} workspace="manager" />
    </PageBody>
  );
}

/** Updates `?profile=` without a server round trip (Next keeps useSearchParams in sync with pushState). */
function setProfileParam(pathname: string, profileId: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (profileId) params.set("profile", profileId);
  else params.delete("profile");
  const query = params.toString();
  window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
}

export function ManagerPageShell({
  section,
  reviewCount,
  reviewsOverSla = 0,
  reviewItems,
  planSteps,
  certReviewItems,
  dealPrepReviewItems,
  developmentPlans,
  leaderboardEntries,
  reviewHistory,
  cadenceRows,
  competencyRows = [],
  teamMembers = [],
  org,
  plans,
  assignees,
  activity,
  profiles,
  seSnapshots,
  coachingByUser,
  challenges,
  mentors,
  approvedCertCountByUser,
  managerFirstName,
  mentees = [],
  viewerRole = "manager",
  readinessAvailable = true,
  featureFlags,
}: {
  section: ManagerSection;
  reviewCount: number;
  reviewsOverSla?: number;
  reviewItems: ReviewItem[];
  planSteps: PlanStepReviewItem[];
  certReviewItems: CertReviewItem[];
  dealPrepReviewItems: DealPrepReviewItem[];
  developmentPlans: DevelopmentPlan[];
  leaderboardEntries: LeaderboardEntry[];
  cadenceRows: CoachingCadenceRow[];
  competencyRows?: CompetencySeRow[];
  teamMembers?: TeamMember[];
  org: Profile[];
  plans: UserPlan[];
  assignees: Profile[];
  activity: ActivityLog[];
  profiles: Profile[];
  reviewHistory: ReviewHistoryEntry[];
  seSnapshots: SeManagerSnapshot[];
  coachingByUser: Record<string, SeCoachingSummary>;
  challenges: Challenge[];
  mentors: Profile[];
  approvedCertCountByUser: Record<string, number>;
  managerFirstName?: string;
  mentees?: MenteeAssignment[];
  viewerRole?: ProfileRole;
  readinessAvailable?: boolean;
  featureFlags?: PlatformFeatureFlags;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(searchParams.get("profile"));

  // Back/forward and in-app links that change ?profile= keep the drawer in sync.
  useEffect(() => {
    setSelectedProfileId(searchParams.get("profile"));
  }, [searchParams]);

  const selectedSnapshot = useMemo(
    () => seSnapshots.find((snapshot) => snapshot.profile.id === selectedProfileId) ?? null,
    [seSnapshots, selectedProfileId],
  );

  const openProfile = useCallback(
    (profileId: string) => {
      setSelectedProfileId(profileId);
      setProfileParam(pathname, profileId);
    },
    [pathname],
  );

  const closeProfile = useCallback(() => {
    setSelectedProfileId(null);
    setProfileParam(pathname, null);
  }, [pathname]);

  let content: ReactNode;

  switch (section) {
    case "inbox":
      content = (
        <ManagerInbox
          certItems={certReviewItems}
          dealPrepItems={dealPrepReviewItems}
          planSteps={planSteps}
          reviewItems={reviewItems}
        />
      );
      break;
    case "roster":
      content = (
        <ManagerTeamRoster
          members={teamMembers}
          onSelectProfile={openProfile}
          readinessAvailable={readinessAvailable}
          tabs={<TeamTabs flags={featureFlags} />}
        />
      );
      break;
    case "readiness":
      content = <TeamReadiness org={org} rows={competencyRows} tabs={<TeamTabs flags={featureFlags} />} />;
      break;
    case "leaderboard":
      content = (
        <>
          <PageHeader
            accent="Practice that shows."
            className="pb-[22px]"
            eyebrow="Team"
            subtitle="Ranked on trophies, simulation scores and weekly practice streaks."
            title="Leaderboard."
          />
          <TeamTabs flags={featureFlags} />
          <Body>
            <ManagerLeaderboard entries={leaderboardEntries} onOpenProfile={openProfile} />
          </Body>
        </>
      );
      break;
    case "history":
      content = (
        <>
          <PageHeader
            accent="What you signed off."
            eyebrow="Coaching"
            subtitle={
              reviewHistory.length === 0
                ? "Reviews you complete show up here."
                : `The last ${reviewHistory.length} ${reviewHistory.length === 1 ? "review" : "reviews"}, newest first.`
            }
            title="Review history."
          />
          <Body>
            <ManagerReviewHistory entries={reviewHistory} />
          </Body>
        </>
      );
      break;
    case "cadence":
      content = (
        <ManagerCoachingCadencePanel
          cadenceRows={cadenceRows}
          coachingByUser={coachingByUser}
          onOpenProfile={openProfile}
          org={org}
        />
      );
      break;
    case "dev":
      content = (
        <ManagerDevelopmentPlansPanel developmentPlans={developmentPlans} onOpenProfile={openProfile} org={org} />
      );
      break;
    case "program":
      content = (
        <>
          <PageHeader accent="Every ramp in one place." eyebrow="Programs" title="Tracker." />
          <Body>
            <div className="flex flex-col gap-7">
              <ManagerProgramTrackerPanel
                activity={activity}
                approvedCertCountByUser={approvedCertCountByUser}
                certReviewItems={certReviewItems}
                coachingByUser={coachingByUser}
                developmentPlans={developmentPlans}
                org={org}
                planSteps={planSteps}
                plans={plans}
              />
              <ManagerCohortView org={org} plans={plans} />
            </div>
          </Body>
        </>
      );
      break;
    case "assign":
      content = (
        <>
          <PageHeader eyebrow="Programs" title="Assign plans." />
          <Body>
            <ManagerAssignPlansSection
              assignees={assignees}
              mentors={mentors}
              org={org}
              plans={plans}
              viewerRole={viewerRole}
            />
          </Body>
        </>
      );
      break;
    case "mentees":
      content = (
        <>
          <PageHeader
            accent="The people you mentor."
            className="pb-[22px]"
            eyebrow="Team"
            title="Mentees."
          />
          <TeamTabs flags={featureFlags} />
          <Body>
            <ManagerMenteesPanel mentees={mentees} />
          </Body>
        </>
      );
      break;
    case "command":
    default:
      content = (
        <ManagerToday
          activity={activity}
          cadenceRows={cadenceRows}
          managerFirstName={managerFirstName}
          members={teamMembers}
          onOpenProfile={openProfile}
          readinessAvailable={readinessAvailable}
          reviewCount={reviewCount}
          reviewsOverSla={reviewsOverSla}
        />
      );
      break;
  }

  return (
    <>
      {content}
      {selectedSnapshot ? (
        <ManagerSeDetailPanel
          challenges={challenges}
          mentors={mentors}
          onClose={closeProfile}
          plans={plans}
          profiles={profiles}
          snapshot={selectedSnapshot}
          teamAssignees={org}
        />
      ) : null}
    </>
  );
}
