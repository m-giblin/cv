import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ManagerCommandCenter } from "@/components/manager/manager-command-center";
import { buildReviewHistory } from "@/components/manager/manager-review-history";
import type { SeManagerSnapshot } from "@/components/manager/manager-se-detail-panel";
import { buildSeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import {
  buildCertSummary,
  buildCohortBenchmark,
  buildQuarterlyAlert,
  buildSimTrend,
} from "@/lib/manager/growth-insights";
import { requireAppAccess } from "@/lib/auth/require-access";
import { fetchDevelopmentPlans } from "@/lib/data/get-development-data";
import {
  fetchManagerCoachingNotes,
  fetchReadinessCertifications,
} from "@/lib/data/get-manager-growth-data";

export default async function ManagerPage() {
  const { data } = await requireAppAccess("/manager");
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
      .filter((step) => step.status === "submitted" && step.assignmentStepId)
      .map((step) => ({
        assignmentStepId: step.assignmentStepId!,
        userId: userPlan.userId,
        title: step.title,
        personName: person?.fullName ?? "Team member",
        stepType: step.type,
      }));
  });

  const certRows = await fetchReadinessCertifications([...orgIds]);
  const reviewCount = openReviews.length + pendingCards.length + pendingPlanSteps.length;
  const pendingCertCount = certRows.filter((row) => row.status === "submitted").length;
  const totalReviewCount = reviewCount + pendingCertCount;
  const averageProgress = orgPlans.length
    ? Math.round(orgPlans.reduce((total, plan) => total + plan.progress, 0) / orgPlans.length)
    : 0;

  const openReviewsByUser: Record<string, number> = {};
  for (const profile of data.myOrg) {
    openReviewsByUser[profile.id] =
      openReviews.filter((review) => review.userId === profile.id).length +
      pendingCards.filter((card) => card.userId === profile.id).length +
      pendingPlanSteps.filter((step) => step.userId === profile.id).length;
  }

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
  );

  const orgSubmissions = data.submissions.filter((item) => orgIds.has(item.userId));
  const orgCoachingCards = data.coachingCards.filter((item) => orgIds.has(item.userId));
  const orgSimulations = data.simulations.filter((item) => orgIds.has(item.assignedTo));
  const developmentPlans = await fetchDevelopmentPlans([...orgIds]);
  const managerNotes = await fetchManagerCoachingNotes(data.currentUser.id, [...orgIds]);

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
    };
  });

  const coachingByUser = Object.fromEntries(
    seSnapshots.map((snapshot) => [snapshot.profile.id, snapshot.coaching]),
  );

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center text-sp-navy-muted">
            Loading team overview…
          </div>
        }
      >
        <ManagerCommandCenter
          activity={orgActivity}
          assignees={
            data.myOrg.length > 0
              ? data.myOrg
              : data.profiles.filter((p) => p.role === "basic_se" || p.role === "senior_se")
          }
          averageProgress={averageProgress}
          challenges={data.challenges}
          coachingByUser={coachingByUser}
          openReviewsByUser={openReviewsByUser}
          org={data.myOrg}
          planSteps={pendingPlanSteps}
          plans={orgPlans}
          profiles={data.profiles}
          reviewCount={totalReviewCount}
          pendingCertCount={pendingCertCount}
          reviewHistory={reviewHistory}
          reviewItems={reviewItems}
          seSnapshots={seSnapshots}
          teamSize={data.myOrg.length}
        />
      </Suspense>
    </AppShell>
  );
}
