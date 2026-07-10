"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import type { CertReviewItem } from "@/components/manager/cert-review-item";
import type { DealPrepReviewItem } from "@/components/manager/deal-prep-review-item";
import { ManagerActionInbox } from "@/components/manager/manager-action-inbox";
import { ManagerCoachingCadencePanel } from "@/components/manager/manager-coaching-cadence-panel";
import { ManagerCommandCenter } from "@/components/manager/manager-command-center";
import { ManagerAssignPlansSection } from "@/components/manager/manager-assign-plans-section";
import { ManagerPlanAssignPanel } from "@/components/manager/manager-plan-assign-panel";
import { ManagerProgramTrackerPanel } from "@/components/manager/manager-program-tracker-panel";
import { ManagerReadinessPanel } from "@/components/manager/manager-readiness-panel";
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
import type { LeaderboardEntry } from "@/lib/gamification/leaderboard";
import type {
 ActivityLog,
 Challenge,
 DevelopmentPlan,
 Profile,
 UserPlan,
} from "@/lib/types";
import { currentQuarter } from "@/lib/development/plan-utils";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import { initials } from "@/lib/utils";

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
 | "assign";

function quarterDesc(plan: DevelopmentPlan, quarter: "Q1" | "Q2" | "Q3" | "Q4") {
 const reviews = plan.goals.flatMap((goal) =>
 goal.quarterlyReviews.filter((review) => review.quarter === quarter),
 );
 if (reviews.length === 0) return "No goals this quarter";
 const achieved = reviews.filter((review) => review.status === "achieved").length;
 const pending = reviews.filter((review) => review.status === "not_started").length;
 if (achieved === reviews.length) return "Attested";
 if (pending > 0) return `${pending} goal${pending === 1 ? "" : "s"} need sign-off`;
 return `${achieved}/${reviews.length} on track`;
}

function quarterColor(plan: DevelopmentPlan, quarter: "Q1" | "Q2" | "Q3" | "Q4", activeQuarter: string) {
 const reviews = plan.goals.flatMap((goal) =>
 goal.quarterlyReviews.filter((review) => review.quarter === quarter),
 );
 const allAchieved = reviews.length > 0 && reviews.every((review) => review.status === "achieved");
 if (allAchieved) return "#10b981";
 if (quarter === activeQuarter) return "#0071ce";
 return "#A09D98";
}

function devPlanAlert(plan: DevelopmentPlan | undefined, activeQuarter: string) {
 if (!plan) return null;
 const dueSoon = plan.goals.some((goal) =>
 goal.quarterlyReviews.some(
 (review) =>
 review.quarter === activeQuarter &&
 review.status === "not_started" &&
 new Date(review.dueDate).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000,
 ),
 );
 if (dueSoon) {
 return { label: `${activeQuarter} due in 3d`, bg: "#fef3c7", color: "#b45309", cta: "Attest now →" };
 }
 const onTrack = plan.goals.every(
 (goal) => goal.overallStatus === "on_track" || goal.overallStatus === "achieved",
 );
 if (onTrack) {
 return { label: "On track", bg: "#dcfce7", color: "#15803d", cta: "View plan" };
 }
 return { label: `${activeQuarter} pending`, bg: "#dbeafe", color: "#1d4ed8", cta: "Review goals" };
}

function ManagerDevelopmentSection({
 developmentPlans,
 org,
}: {
 developmentPlans: DevelopmentPlan[];
 org: Profile[];
}) {
 const router = useRouter();
 const activeQuarter = currentQuarter();

 const duePlanAlert = (() => {
 for (const plan of developmentPlans) {
 const person = org.find((profile) => profile.id === plan.userId);
 const pendingGoals = plan.goals.filter((goal) =>
 goal.quarterlyReviews.some(
 (review) =>
 review.quarter === activeQuarter &&
 review.status === "not_started" &&
 new Date(review.dueDate).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000,
 ),
 ).length;
 if (pendingGoals > 0) {
 const days = 3;
 return {
 seeName: person?.fullName.split(" ")[0] ?? "Team member",
 pendingGoals,
 days,
 planTitle: plan.goals[0]?.title ?? "Development plan",
 userId: plan.userId,
 };
 }
 }
 return null;
 })();

 function openAttestation(userId: string) {
 router.push(`/development?profile=${userId}`);
 toast.info("Opening development plan for quarterly attestation");
 }

 function handlePlanCta(profileId: string, cta?: string) {
 if (cta === "Attest now →") {
 openAttestation(profileId);
 return;
 }
 router.push(`/development?profile=${profileId}`);
 }

 return (
 <div className="space-y-[16px]">
 {duePlanAlert ? (
 <div
 className="mb-[16px] flex items-center justify-between gap-[16px] p-[14px_18px]"
 style={{ background: "linear-gradient(135deg,#fef3c7,#fef9ec)", border: "1.5px solid #fde68a" }}
 >
 <div className="flex items-center gap-[10px]">
 <svg
 fill="none"
 height="18"
 stroke="#d97706"
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth="1.6"
 viewBox="0 0 16 16"
 width="18"
 >
 <path d="M8 2L15 13H1z" />
 <line x1="8" x2="8" y1="7" y2="10" />
 <circle cx="8" cy="11.5" fill="#d97706" r=".5" stroke="none" />
 </svg>
 <div>
 <p className="text-[12px] font-bold text-[#92400e]">
 {duePlanAlert.seeName} — {activeQuarter} attestation due in {duePlanAlert.days} days
 </p>
 <p className="mt-[2px] text-[11px] text-[#b45309]">
 {duePlanAlert.planTitle} · {duePlanAlert.pendingGoals} goal
 {duePlanAlert.pendingGoals === 1 ? "" : "s"} need your sign-off
 </p>
 </div>
 </div>
 <button
 className="inline-flex shrink-0 items-center px-[18px] py-[9px] text-[12.5px] font-semibold text-white"
 onClick={() => duePlanAlert && openAttestation(duePlanAlert.userId)}
 style={{ background: "#d97706" }}
 type="button"
 >
 Attest now →
 </button>
 </div>
 ) : null}

 <div className="space-y-[12px]">
 {org.map((profile) => {
 const plan = developmentPlans.find((item) => item.userId === profile.id);
 const alert = devPlanAlert(plan, activeQuarter);
 const goalsOnTrack =
 plan?.goals.filter((goal) => goal.overallStatus === "on_track" || goal.overallStatus === "achieved")
 .length ?? 0;

 return (
 <div className="overflow-hidden border border-[#E2DFD9] bg-white" key={profile.id}>
 <div className="flex items-center gap-[12px] border-b border-[#ECEAE6] p-[14px_18px]">
 <div
 className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
 style={{ background: avatarGradientForId(profile.id) }}
 >
 {initials(profile.fullName)}
 </div>
 <div className="min-w-0 flex-1">
 <div className="mb-[2px] flex items-center gap-[7px]">
 <span className="text-[13px] font-bold text-[#0D0E12]">{profile.fullName}</span>
 {alert ? (
 <span
 className="font-mono text-[8px] uppercase tracking-[0.08em] px-[8px] py-[2px] text-[9.5px] font-bold"
 style={{ background: alert.bg, color: alert.color }}
 >
 {alert.label}
 </span>
 ) : null}
 </div>
 <p className="text-[11px] text-[#6B6860]">
 {plan
 ? `${plan.goals.length} goals · FY${plan.year} · ${goalsOnTrack} on track`
 : "No development plan"}
 </p>
 </div>
 <button
 className="inline-flex items-center border border-[#E2DFD9] bg-white px-[13px] py-[6px] text-[11.5px] font-semibold text-[#3D3C38]"
 onClick={() => handlePlanCta(profile.id, alert?.cta)}
 type="button"
 >
 {alert?.cta ?? "View plan"}
 </button>
 </div>

 {plan ? (
 <div className="grid grid-cols-4">
 {(["Q1", "Q2", "Q3", "Q4"] as const).map((quarter) => (
 <div className="border-r border-[#ECEAE6] p-[11px_14px] last:border-r-0" key={quarter}>
 <p
 className="mb-[4px] text-[9.5px] font-bold tracking-[0.04em]"
 style={{ color: quarterColor(plan, quarter, activeQuarter) }}
 >
 {quarter}
 </p>
 <p className="text-[11px] leading-[1.5] text-[#3D3C38]">{quarterDesc(plan, quarter)}</p>
 </div>
 ))}
 </div>
 ) : null}
 </div>
 );
 })}
 </div>

 {org.length === 0 ? (
 <p className="text-[12.5px] text-[#A09D98]">No team members in your org.</p>
 ) : null}
 </div>
 );
}

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
 <div className="animate-[fadeUp_0.2s_ease-out] space-y-4">
 <ManagerTeamRoster
 coachingByUser={coachingByUser}
 onSelectProfile={openProfile}
 org={org}
 plans={plans}
 selectedProfileId={selectedProfileId}
 />
 <div className="border border-[#E2DFD9] bg-white p-4 ">
 <ManagerPlanAssignPanel assignees={assignees} mentors={mentors} plans={plans} />
 </div>
 </div>
 );
 break;
 case "readiness":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ManagerReadinessPanel />
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
 <ManagerCoachingCadencePanel
 coachingByUser={coachingByUser}
 onSelectSe={openProfile}
 org={org}
 plans={plans}
 rows={cadenceRows}
 />
 </div>
 );
 break;
 case "dev":
 content = <ManagerDevelopmentSection developmentPlans={developmentPlans} org={org} />;
 break;
 case "program":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ManagerProgramTrackerPanel org={org} plans={plans} />
 </div>
 );
 break;
 case "assign":
 content = (
 <div className="animate-[fadeUp_0.2s_ease-out]">
 <ManagerAssignPlansSection assignees={assignees} mentors={mentors} org={org} plans={plans} />
 </div>
 );
 break;
 case "command":
 default:
 content = (
 <ManagerCommandCenter
 approvedCertCountByUser={approvedCertCountByUser}
 averageProgress={averageProgress}
 cadenceRows={cadenceRows}
 certReviewItems={certReviewItems}
 challengeTotalByUser={challengeTotalByUser}
 coachingByUser={coachingByUser}
 developmentPlans={developmentPlans}
 managerFirstName={managerFirstName}
 onSelectProfile={openProfile}
 pendingCertCount={pendingCertCount}
 planStepCount={planSteps.length}
 plans={plans}
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
 eyebrow={header.eyebrow}
 eyebrowColor={header.eyebrowColor}
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
