import dynamic from "next/dynamic";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import type { ManagerSection } from "@/components/manager/manager-page-shell";
import { MANAGER_SECTION_PATHS } from "@/lib/manager/manager-routes";
import { buildCoachingCadence } from "@/lib/manager/coaching-cadence";
import { eligibleMentorsForOrg } from "@/lib/manager/eligible-mentors";
import { buildReviewHistory } from "@/components/manager/manager-review-history";
import type { SeManagerSnapshot } from "@/components/manager/manager-se-detail-panel";
import { buildSeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import { fetchSharedDealPrepForManager } from "@/lib/data/get-deal-prep-manager-stats";
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
import { isFeatureEnabled, isManagerSectionAllowed } from "@/lib/platform/feature-flags";
import { fetchReadinessMapPayload } from "@/lib/manager/readiness-map-fetch";
import type { ReadinessMapPayload } from "@/lib/manager/readiness-map-data";
import { checkAndNotifyThresholdCrossings } from "@/lib/manager/readiness-nudges";
import {
 INBOX_SLA_DAYS,
 ageInDays,
 buildTeamMember,
 sortByUrgency,
 type PendingReviewSummary,
} from "@/lib/manager/team-status";
import { loadPlatformSettings } from "@/lib/platform/settings";
import { redirect } from "next/navigation";
import {
 fetchMenteeAssignments,
 fetchMentorCoachingNotesForManager,
} from "@/lib/data/fetch-mentor-mentees";
import {
 fetchManagerCoachingNotes,
 fetchReadinessCertifications,
} from "@/lib/data/get-manager-growth-data";
import { createClient } from "@/lib/supabase/server";

/** Sections that show readiness numbers and so need the readiness payload. */
const READINESS_SECTIONS = new Set(["command", "roster", "readiness"]);

const ManagerPageShell = dynamic(
 () => import("@/components/manager/manager-page-shell").then((mod) => mod.ManagerPageShell),
 {
 loading: () => (
 <div aria-busy="true" className="flex min-h-[40vh] items-center justify-center" role="status">
 <span className="label-mono">Loading team overview…</span>
 </div>
 ),
 },
);

export async function ManagerSectionPage({ section }: { section: ManagerSection }) {
 const { data, role } = await requireManagerPageAccess();
 const settings = await loadPlatformSettings(data.currentUser.tenantId ?? undefined);
 if (!isManagerSectionAllowed(section, settings.featureFlags)) {
 redirect(MANAGER_SECTION_PATHS.command);
 }
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

 const wantsReadiness =
 READINESS_SECTIONS.has(section) && isFeatureEnabled(settings.featureFlags, "readiness-map");

 const [
 certRows,
 sharedDealPrep,
 developmentPlans,
 managerNotes,
 mentees,
 mentorNotesByUser,
 readinessPayload,
 ] = await Promise.all([
 fetchReadinessCertifications([...orgIds]),
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
 (async (): Promise<ReadinessMapPayload | null> => {
 if (!wantsReadiness || orgIds.size === 0) return null;
 const supabase = await createClient();
 if (!supabase) return null;
 try {
 const payload = await fetchReadinessMapPayload(supabase, data.currentUser.tenantId, [...orgIds]);
 // Same best-effort threshold nudges the readiness API used to send on page load.
 try {
 await checkAndNotifyThresholdCrossings(supabase, data.currentUser.id, payload.rows);
 } catch {
 // nudges must never break the page
 }
 return payload;
 } catch {
 return null;
 }
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
 for (const profile of data.myOrg) {
 const userSubmissions = data.submissions.filter((s) => s.userId === profile.id);
 reviewedChallengeCountByUser[profile.id] = userSubmissions.filter((s) => s.status === "reviewed").length;
 approvedCertCountByUser[profile.id] = certRows.filter(
 (row) => row.userId === profile.id && row.status === "approved",
 ).length;
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
 userId: submission.userId,
 submittedAt: submission.submittedAt,
 title: challenge?.title ?? "Challenge submission",
 personName: person?.fullName ?? "Team member",
 reflectionText: submission.reflectionText,
 };
 }),
 ...pendingCards.map((card) => {
 const person = data.profiles.find((profile) => profile.id === card.userId);
 const simulation = data.simulations.find((item) => item.id === card.simulationAssignmentId);
 const context = card.simulationContext;

 return {
 kind: "coaching" as const,
 id: card.id,
 userId: card.userId,
 submittedAt: card.sentToManagerAt,
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

 const now = Date.now();
 const pendingEntries: Array<{ userId: string } & Omit<PendingReviewSummary, "count">> = [
 ...openReviews.map((submission) => ({
 userId: submission.userId,
 kind: "challenge" as const,
 title: data.challenges.find((item) => item.id === submission.challengeId)?.title ?? "Challenge",
 ageDays: ageInDays(submission.submittedAt, now),
 })),
 ...pendingCards.map((card) => ({
 userId: card.userId,
 kind: "sim" as const,
 title: `${card.simulationContext?.persona ?? "Simulation"} sim`,
 ageDays: ageInDays(card.sentToManagerAt, now),
 })),
 ...pendingPlanSteps.map((step) => ({
 userId: step.userId,
 kind: "plan_step" as const,
 title: step.title,
 ageDays: null,
 })),
 ...certReviewItems.map((cert) => ({
 userId: cert.userId,
 kind: "cert" as const,
 title: `${cert.label} gate`,
 ageDays: null,
 })),
 ];
 const pendingByUser: Record<string, PendingReviewSummary> = {};
 for (const entry of pendingEntries) {
 const current = pendingByUser[entry.userId];
 const count = (current?.count ?? 0) + 1;
 const older = !current || (entry.ageDays ?? -1) > (current.ageDays ?? -1);
 pendingByUser[entry.userId] = older
 ? { title: entry.title, kind: entry.kind, ageDays: entry.ageDays, count }
 : { ...current!, count };
 }
 const reviewsOverSla = [
 ...pendingEntries.map((entry) => entry.ageDays),
 ...dealPrepReviewItems.map((item) => ageInDays(item.createdAt, now)),
 ].filter((age): age is number => age !== null && age > INBOX_SLA_DAYS).length;

 const readinessRowByUser = new Map((readinessPayload?.rows ?? []).map((row) => [row.userId, row]));
 const cadenceByUser = new Map(cadenceRows.map((row) => [row.profileId, row.daysSinceCoaching]));
 const teamMembers = sortByUrgency(
 seSnapshots.map((snapshot) => {
 const mapRow = readinessRowByUser.get(snapshot.profile.id);
 return buildTeamMember({
 profile: snapshot.profile,
 plan: snapshot.plan,
 coaching: snapshot.coaching,
 certSummary: snapshot.certSummary,
 openReviewCount: snapshot.openReviewCount,
 pending: pendingByUser[snapshot.profile.id] ?? null,
 readiness: readinessPayload
 ? (mapRow?.composite ?? null)
 : (readinessByUser[snapshot.profile.id] ?? null),
 competencySummary: mapRow?.competencySummary,
 daysSinceCoaching: cadenceByUser.get(snapshot.profile.id) ?? null,
 now,
 });
 }),
 );
 const competencyRows = (readinessPayload?.rows ?? [])
 .filter((row) => orgIds.has(row.userId))
 .map((row) => ({
 userId: row.userId,
 fullName: row.fullName,
 firstName: row.firstName,
 competencySummary: row.competencySummary,
 }));

 const coachingByUser = Object.fromEntries(
 seSnapshots.map((snapshot) => [snapshot.profile.id, snapshot.coaching]),
 );

 const mentors = eligibleMentorsForOrg(data.profiles, orgIds);

 return (
 <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
 <Suspense
 fallback={
 <div aria-busy="true" className="flex min-h-[40vh] items-center justify-center" role="status">
 <span className="label-mono">Loading team overview…</span>
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
 cadenceRows={cadenceRows}
 competencyRows={competencyRows}
 certReviewItems={certReviewItems}
 challenges={data.challenges}
 coachingByUser={coachingByUser}
 dealPrepReviewItems={dealPrepReviewItems}
 developmentPlans={developmentPlans}
 leaderboardEntries={leaderboardEntries}
 mentors={mentors}
 org={data.myOrg}
 planSteps={pendingPlanSteps}
 plans={orgPlans}
 profiles={data.profiles}
 reviewCount={totalReviewCount}
 reviewHistory={reviewHistory}
 reviewsOverSla={reviewsOverSla}
 teamMembers={teamMembers}
 reviewItems={reviewItems}
 section={section}
 seSnapshots={seSnapshots}
 managerFirstName={data.currentUser.fullName.split(" ")[0]}
 readinessAvailable={isManagerSectionAllowed("readiness", settings.featureFlags)}
 mentees={mentees}
 viewerRole={role}
 />
 </Suspense>
 </AppShell>
 );
}
