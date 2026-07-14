"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, type ReactNode } from "react";
import type { CertReviewItem } from "@/components/manager/cert-review-item";
import type { DealPrepReviewItem } from "@/components/manager/deal-prep-review-item";
import { ManagerMenteesPanel } from "@/components/manager/manager-mentees-panel";
import { ManagerActionInbox } from "@/components/manager/manager-action-inbox";
import { ManagerCoachingCadencePanel } from "@/components/manager/manager-coaching-cadence-panel";
import { ManagerDevelopmentPlansPanel } from "@/components/manager/manager-development-plans-panel";
import { ManagerCommandCenter } from "@/components/manager/manager-command-center";
import { ManagerAssignPlansSection } from "@/components/manager/manager-assign-plans-section";
import { ManagerProgramTrackerPanel } from "@/components/manager/manager-program-tracker-panel";
import { ReadinessMap } from "@/components/manager/readiness-map";
import {
 ManagerSeDetailPanel,
 type SeManagerSnapshot,
} from "@/components/manager/manager-se-detail-panel";
import { ManagerTeamRoster } from "@/components/manager/manager-team-roster";
import {
 MANAGER_SECTION_HEADERS,
 ManagerPageLayout,
} from "@/components/manager/manager-page-layout";
import type { PlanStepReviewItem } from "@/components/manager/plan-step-review-panel";
import type { ReviewItem } from "@/components/manager/review-queue";
import { ManagerReviewHistory, type ReviewHistoryEntry } from "@/components/manager/manager-review-history";
import { TeamLeaderboard } from "@/components/gamification/team-leaderboard";
import type { CoachingCadenceRow } from "@/lib/manager/coaching-cadence";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import type { TeamReadinessRow } from "@/lib/manager/team-readiness";
import type { MenteeAssignment } from "@/lib/data/fetch-mentor-mentees";
import type { LeaderboardEntry } from "@/lib/gamification/leaderboard";
import type {
 ActivityLog,
 Challenge,
 DevelopmentPlan,
 Profile,
 UserPlan,
} from "@/lib/types";

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

export function ManagerPageShell({
 section,
 reviewCount,
 pendingCertCount,
 teamSize,
 averageProgress,
 reviewItems,
 planSteps,
 certReviewItems,
 dealPrepReviewItems,
 developmentPlans,
 readinessRows,
 leaderboardEntries,
 reviewHistory,
 cadenceRows,
 org,
 plans,
 openReviewsByUser,
 assignees,
 activity,
 profiles,
 seSnapshots,
 coachingByUser,
 challenges,
 mentors,
 reviewedChallengeCountByUser,
 approvedCertCountByUser,
 challengeTotalByUser,
 managerFirstName,
 mentees = [],
 viewerRole = "manager",
}: {
 section: ManagerSection;
 reviewCount: number;
 pendingCertCount: number;
 teamSize: number;
 averageProgress: number;
 reviewItems: ReviewItem[];
 planSteps: PlanStepReviewItem[];
 certReviewItems: CertReviewItem[];
 dealPrepReviewItems: DealPrepReviewItem[];
 developmentPlans: DevelopmentPlan[];
 readinessRows: TeamReadinessRow[];
 leaderboardEntries: LeaderboardEntry[];
 cadenceRows: CoachingCadenceRow[];
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
 mentors: Profile[];
 reviewedChallengeCountByUser: Record<string, number>;
 approvedCertCountByUser: Record<string, number>;
 challengeTotalByUser: Record<string, number>;
 managerFirstName?: string;
 mentees?: MenteeAssignment[];
 viewerRole?: import("@/lib/types").ProfileRole;
}) {
 const router = useRouter();
 const searchParams = useSearchParams();
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

 let content: ReactNode;

 switch (section) {
 case "inbox":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ManagerActionInbox
 certItems={certReviewItems}
 dealPrepItems={dealPrepReviewItems}
 planSteps={planSteps}
 reviewItems={reviewItems}
 />
 </div>
 );
 break;
 case "roster":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ManagerTeamRoster
 coachingByUser={coachingByUser}
 onSelectProfile={openProfile}
 org={org}
 plans={plans}
 selectedProfileId={selectedProfileId}
 />
 </div>
 );
 break;
 case "readiness":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ReadinessMap onOpenProfile={openProfile} />
 </div>
 );
 break;
 case "leaderboard":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <TeamLeaderboard entries={leaderboardEntries} fullPage />
 </div>
 );
 break;
 case "history":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ManagerReviewHistory entries={reviewHistory} fullPage />
 </div>
 );
 break;
 case "cadence":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ManagerCoachingCadencePanel org={org} />
 </div>
 );
 break;
 case "dev":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ManagerDevelopmentPlansPanel />
 </div>
 );
 break;
 case "program":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ManagerProgramTrackerPanel
 org={org}
 plans={plans}
 coachingByUser={coachingByUser}
 approvedCertCountByUser={approvedCertCountByUser}
 developmentPlans={developmentPlans}
 activity={activity}
 planSteps={planSteps}
 certReviewItems={certReviewItems}
 />
 </div>
 );
 break;
 case "assign":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ManagerAssignPlansSection assignees={assignees} mentors={mentors} org={org} plans={plans} viewerRole={viewerRole} />
 </div>
 );
 break;
 case "mentees":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ManagerMenteesPanel mentees={mentees} />
 </div>
 );
 break;
 case "command":
 default:
 content = (
 <ManagerCommandCenter
 approvedCertCountByUser={approvedCertCountByUser}
 activity={activity}
 averageProgress={averageProgress}
 cadenceRows={cadenceRows}
 certReviewItems={certReviewItems}
 challengeTotalByUser={challengeTotalByUser}
 coachingByUser={coachingByUser}
 developmentPlans={developmentPlans}
 leaderboardEntries={leaderboardEntries}
 onSelectProfile={openProfile}
 pendingCertCount={pendingCertCount}
 planStepCount={planSteps.length}
 plans={plans}
 profiles={profiles}
 readinessRows={readinessRows}
 reviewCount={reviewCount}
 reviewedChallengeCountByUser={reviewedChallengeCountByUser}
 reviewItems={reviewItems}
 teamSize={teamSize}
 org={org}
 />
 );
 break;
 }

 const header = MANAGER_SECTION_HEADERS[section] ?? MANAGER_SECTION_HEADERS.command;

 return (
 <>
 <ManagerPageLayout
 bleed={header.bleed}
 compact={header.compact}
 eyebrow={header.eyebrow}
 eyebrowColor={header.eyebrowColor}
 headerRight={undefined}
 subtitle={header.subtitle}
 title={header.title}
 >
 {content}
 </ManagerPageLayout>
 {selectedSnapshot ? (
 <ManagerSeDetailPanel
 challenges={challenges}
 mentors={mentors}
 onClose={closeProfile}
 plans={plans}
 profiles={profiles}
 snapshot={selectedSnapshot}
 />
 ) : null}
 </>
 );
}
