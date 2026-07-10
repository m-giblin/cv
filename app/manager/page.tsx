import dynamic from "next/dynamic";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import type { ManagerSection } from "@/components/manager/manager-page-shell";
import { buildCoachingCadence } from "@/lib/manager/coaching-cadence";
import { eligibleMentorsForOrg } from "@/lib/manager/eligible-mentors";
import { buildReviewHistory } from "@/components/manager/manager-review-history";
import type { SeManagerSnapshot } from "@/components/manager/manager-se-detail-panel";
import { buildSeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import {
 fetchDealPrepManagerStats,
 fetchSharedDealPrepForManager,
} from "@/lib/data/get-deal-prep-manager-stats";
import {
 buildCertSummary,
 buildCohortBenchmark,
 buildQuarterlyAlert,
 buildSimTrend,
} from "@/lib/manager/growth-insights";
import { buildTeamReadiness, certLabel } from "@/lib/manager/team-readiness";
import { buildTeamLeaderboard } from "@/lib/gamification/leaderboard";
import { requireManagerPageAccess } from "@/lib/auth/require-access";
import { fetchDevelopmentPlans } from "@/lib/data/get-development-data";
import {
 fetchMenteeAssignments,
 fetchMentorCoachingNotesForManager,
} from "@/lib/data/fetch-mentor-mentees";
import {
 fetchManagerCoachingNotes,
 fetchReadinessCertifications,
} from "@/lib/data/get-manager-growth-data";
import { createClient } from "@/lib/supabase/server";

const ManagerPageShell = dynamic(
 () => import("@/components/manager/manager-page-shell").then((mod) => mod.ManagerPageShell),
 {
 loading: () => (
 <div className="flex min-h-[40vh] items-center justify-center text-[#6B6860]">
 Loading team overview…
 </div>
 ),
 },
);

const VALID_SECTIONS = new Set<ManagerSection>([
 "command",
 "inbox",
 "roster",
 "readiness",
 "leaderboard",
 "cadence",
 "history",
 "dev",
 "program",
 "assign",
 "mentees",
]);

type ManagerPageProps = {
 searchParams: Promise<{ section?: string; profile?: string }>;
};

export default async function ManagerPage({ searchParams }: ManagerPageProps) {
 const params = await searchParams;
 const section: ManagerSection =
 params.section && VALID_SECTIONS.has(params.section as ManagerSection)
 ? (params.section as ManagerSection)
 : "command";

 const { data } = await requireManagerPageAccess();
 const orgIds = new Set(data.myOrg.map((profile) => profile.id));
 const orgPlans = data.plans.filter((plan) => orgIds.has(plan.userId));
 const orgActivity = data.activity.filter((item) => orgIds.has(item.userId));
 const openReviews = data.submissions.filter(
 (submission) => orgIds.has(submission.userId) && submission.status === "submitted",
 );
 const pendingCards = data.coachingCards.filter(
 (card) => orgIds.has(card.userId) && card.managerReviewStatus === "pending" && !card.isPractice,
 );
 const pendingPlanSteps = orgPlans.flatMap((userPlan) => {
 const person = data.profiles.find((profile) => profile.id === userPlan.userId);
 return userPlan.steps
 .filter(
 (step) =>
 (step.status === "submitted" || step.status === "under_review") && step.assignmentStepId,
 )
 .map((step) => ({
 assignmentStepId: step.assignmentStepId!,
 userId: userPlan.userId,
 title: step.title,
 personName: person?.fullName ?? "Team member",
 stepType: step.type,
 mentorEndorsed: step.status === "under_review",
 isManagerGate: step.isSegmentGate ?? false,
 }));
 });

 const [certRows, dealPrepStats, sharedDealPrep, developmentPlans, managerNotes, mentees, mentorNotesByUser] =
 await Promise.all([
 fetchReadinessCertifications([...orgIds]),
 fetchDealPrepManagerStats([...orgIds]),
 fetchSharedDealPrepForManager([...orgIds]),
 fetchDevelopmentPlans([...orgIds]),
 fetchManagerCoachingNotes(data.currentUser.id, [...orgIds]),
 (async () => {
 const supabase = await createClient();
 if (!supabase) return [];
 return fetchMenteeAssignments(
 supabase,
 data.currentUser.id,
 data.profiles,
 data.currentUser.tenantId,
 );
 })(),
 (async () => {
 const supabase = await createClient();
 if (!supabase) return {};
 return fetchMentorCoachingNotesForManager(supabase, [...orgIds]);
 })(),
 ]);
 const dealPrepReviewItems = sharedDealPrep.map((session) => {
 const person = data.profiles.find((profile) => profile.id === session.user_id);
 return {
 id: session.id,
 userId: session.user_id,
 personName: person?.fullName ?? "Team member",
 accountName: session.account_name,
 industry: session.industry,
 createdAt: session.created_at,
 };
 });
 const reviewCount = openReviews.length + pendingCards.length + pendingPlanSteps.length;
 const pendingCertRows = certRows.filter((row) => row.status === "submitted" && orgIds.has(row.userId));
 const pendingCertCount = pendingCertRows.length;
 const totalReviewCount = reviewCount + pendingCertCount;
 const averageProgress = orgPlans.length
 ? Math.round(orgPlans.reduce((total, plan) => total + plan.progress, 0) / orgPlans.length)
 : 0;

 const openReviewsByUser: Record<string, number> = {};
 for (const profile of data.myOrg) {
 const certPending = pendingCertRows.filter((row) => row.userId === profile.id).length;
 openReviewsByUser[profile.id] =
 openReviews.filter((review) => review.userId === profile.id).length +
 pendingCards.filter((card) => card.userId === profile.id).length +
 pendingPlanSteps.filter((step) => step.userId === profile.id).length +
 certPending;
 }

 const certReviewItems = pendingCertRows.map((row) => {
 const person = data.profiles.find((profile) => profile.id === row.userId);
 return {
 id: row.id,
 userId: row.userId,
 personName: person?.fullName ?? "Team member",
 certificationType: row.certificationType,
 label: certLabel(row.certificationType),
 submittedAt: null,
 };
 });

 const certsByUser: Record<string, typeof certRows> = {};
 for (const row of certRows) {
 certsByUser[row.userId] ??= [];
 certsByUser[row.userId]!.push(row);
 }

 const readinessRows = buildTeamReadiness(
 data.myOrg,
 {
 coachingCards: data.coachingCards,
 submissions: data.submissions,
 simulations: data.simulations,
 },
 certsByUser,
 openReviewsByUser,
 );

 const readinessByUser = Object.fromEntries(readinessRows.map((row) => [row.profileId, row.readinessIndex]));
 const cadenceRows = buildCoachingCadence(data.myOrg, data.coachingCards, openReviewsByUser, readinessByUser);

 const reviewedChallengeCountByUser: Record<string, number> = {};
 const approvedCertCountByUser: Record<string, number> = {};
 const challengeTotalByUser: Record<string, number> = {};
 for (const profile of data.myOrg) {
 const userSubmissions = data.submissions.filter((s) => s.userId === profile.id);
 reviewedChallengeCountByUser[profile.id] = userSubmissions.filter((s) => s.status === "reviewed").length;
 approvedCertCountByUser[profile.id] = certRows.filter(
 (row) => row.userId === profile.id && row.status === "approved",
 ).length;
 const reviewed = reviewedChallengeCountByUser[profile.id] ?? 0;
 const targetTotal = profile.level === "Senior" || profile.level === "Advisory" ? 8 : 4;
 challengeTotalByUser[profile.id] = Math.max(userSubmissions.length, targetTotal, reviewed);
 }

 const reviewedSimCountByUser: Record<string, number> = {};
 for (const profile of data.myOrg) {
 reviewedSimCountByUser[profile.id] = data.coachingCards.filter(
 (c) => c.userId === profile.id && c.managerReviewStatus === "reviewed" && !c.isPractice,
 ).length;
 }

 const leaderboardEntries = buildTeamLeaderboard({
 org: data.myOrg,
 coachingCards: data.coachingCards,
 reviewedChallengeCountByUser,
 reviewedSimCountByUser,
 });

 const reviewItems = [
 ...openReviews.map((submission) => {
 const person = data.profiles.find((profile) => profile.id === submission.userId);
 const challenge = data.challenges.find((item) => item.id === submission.challengeId);

 return {
 kind: "submission" as const,
 id: submission.id,
 title: challenge?.title ?? "Challenge submission",
 personName: person?.fullName ?? "Team member",
 };
 }),
 ...pendingCards.map((card) => {
 const person = data.profiles.find((profile) => profile.id === card.userId);
 const simulation = data.simulations.find((item) => item.id === card.simulationAssignmentId);
 const context = card.simulationContext;

 return {
 kind: "coaching" as const,
 id: card.id,
 title: context?.persona ?? simulation?.persona ?? "Simulation coaching card",
 personName: person?.fullName ?? "Team member",
 score: card.score,
 strengths: card.strengths,
 gaps: card.gaps,
 recommendedImprovements: card.recommendedImprovements,
 managerSummary: card.managerSummary,
 seReflection: card.seReflection,
 transcript:
 card.transcript ??
 (simulation?.transcript.length
 ? simulation.transcript
 .map((entry) => `${entry.speaker === "se" ? "SE" : entry.speaker}: ${entry.message}`)
 .join("\n\n")
 : undefined),
 simulationLabel: context
 ? `${context.solutionFocus} • ${context.vertical} • ${context.difficulty}`
 : simulation
 ? `${simulation.solutionFocus} • ${simulation.vertical} • ${simulation.difficulty}`
 : undefined,
 };
 }),
 ];

 const reviewHistory = buildReviewHistory(
 data.coachingCards,
 orgIds,
 data.profiles,
 orgActivity,
 100,
 );

 const orgSubmissions = data.submissions.filter((item) => orgIds.has(item.userId));
 const orgCoachingCards = data.coachingCards.filter((item) => orgIds.has(item.userId));
 const orgSimulations = data.simulations.filter((item) => orgIds.has(item.assignedTo));

 const seSnapshots: SeManagerSnapshot[] = data.myOrg.map((profile) => {
 const plan = orgPlans.find((item) => item.userId === profile.id);
 const developmentPlan = developmentPlans.find((item) => item.userId === profile.id) ?? null;
 const mentor = plan?.mentorId
 ? data.profiles.find((item) => item.id === plan.mentorId)
 : undefined;
 const submissions = orgSubmissions.filter((item) => item.userId === profile.id);
 const coachingCards = orgCoachingCards.filter((item) => item.userId === profile.id);
 const activity = orgActivity
 .filter((item) => item.userId === profile.id)
 .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

 const profileCerts = certRows.filter((row) => row.userId === profile.id);
 const approvedCerts = profileCerts
 .filter((row) => row.status === "approved")
 .map((row) => row.certificationType);

 const simTrend = buildSimTrend(coachingCards);
 const cohortBenchmark = buildCohortBenchmark({
 profileId: profile.id,
 plan,
 coachingCards,
 orgPlans,
 orgCoachingCards,
 });
 const quarterlyAlert = buildQuarterlyAlert(developmentPlan);
 const certSummary = buildCertSummary(profile, profileCerts);

 const coaching = buildSeCoachingSummary({
 profile,
 plan,
 developmentPlan,
 coachingCards,
 submissions,
 activity,
 openReviewCount: openReviewsByUser[profile.id] ?? 0,
 competencies: data.competencies,
 approvedCerts,
 simTrend,
 cohortBenchmark,
 quarterlyAlert,
 certSummary,
 });

 return {
 profile,
 plan,
 developmentPlan,
 mentor,
 submissions,
 coachingCards,
 simulations: orgSimulations.filter((item) => item.assignedTo === profile.id),
 activity,
 openReviewCount: openReviewsByUser[profile.id] ?? 0,
 coaching,
 simTrend,
 cohortBenchmark,
 quarterlyAlert,
 certSummary,
 managerNotes: managerNotes[profile.id] ?? "",
 mentorNotes: mentorNotesByUser[profile.id] ?? null,
 };
 });

 const coachingByUser = Object.fromEntries(
 seSnapshots.map((snapshot) => [snapshot.profile.id, snapshot.coaching]),
 );

 const mentors = eligibleMentorsForOrg(data.profiles, orgIds);

 return (
 <AppShell currentUser={data.currentUser} notifications={data.notifications}>
 <Suspense
 fallback={
 <div className="flex min-h-[40vh] items-center justify-center text-[#6B6860]">
 Loading team overview…
 </div>
 }
 >
 <ManagerPageShell
 activity={orgActivity}
 approvedCertCountByUser={approvedCertCountByUser}
 assignees={
 data.myOrg.length > 0
 ? data.myOrg
 : data.profiles.filter((p) => p.role === "basic_se" || p.role === "senior_se")
 }
 averageProgress={averageProgress}
 cadenceRows={cadenceRows}
 certReviewItems={certReviewItems}
 challenges={data.challenges}
 challengeTotalByUser={challengeTotalByUser}
 coachingByUser={coachingByUser}
 dealPrepReviewItems={dealPrepReviewItems}
 developmentPlans={developmentPlans}
 leaderboardEntries={leaderboardEntries}
 mentors={mentors}
 openReviewsByUser={openReviewsByUser}
 org={data.myOrg}
 pendingCertCount={pendingCertCount}
 planSteps={pendingPlanSteps}
 plans={orgPlans}
 profiles={data.profiles}
 readinessRows={readinessRows}
 reviewCount={totalReviewCount}
 reviewHistory={reviewHistory}
 reviewItems={reviewItems}
 reviewedChallengeCountByUser={reviewedChallengeCountByUser}
 section={section}
 seSnapshots={seSnapshots}
 teamSize={data.myOrg.length}
 managerFirstName={data.currentUser.fullName.split(" ")[0]}
 mentees={mentees}
 />
 </Suspense>
 </AppShell>
 );
}
