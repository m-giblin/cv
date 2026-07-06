import { Suspense } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { ChallengesHeaderStats } from "@/components/challenges/challenges-header-stats";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { GapPracticePanel } from "@/components/practice/gap-practice-panel";
import { recommendChallengesForGaps } from "@/lib/challenges/gap-recommendations";
import { requireChallengesPageAccess } from "@/lib/auth/require-access";

const ChallengesPortal = dynamic(
  () => import("@/components/challenges/challenges-portal").then((mod) => mod.ChallengesPortal),
  {
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-stone-200 bg-white text-sm text-stone-500">
        Loading challenges…
      </div>
    ),
  },
);

type ChallengesPageProps = {
  searchParams: Promise<{ focus?: string; step?: string; challenge?: string; view?: string }>;
};

export default async function ChallengesPage({ searchParams }: ChallengesPageProps) {
  const { data, dashboard, tier } = await requireChallengesPageAccess();
  const params = await searchParams;
  const isFocused = params.focus === "challenge";

  const userSubmissions = data.submissions;

  const plan = data.plans.find((item) => item.userId === data.currentUser.id);
  const linkedStep = params.step ? plan?.steps.find((step) => step.id === params.step) : undefined;
  const linkedChallengeId = params.challenge ?? linkedStep?.challengeId;

  const reviewedIds = new Set(
    userSubmissions.filter((submission) => submission.status === "reviewed").map((submission) => submission.challengeId),
  );

  const initialChallengeId =
    (linkedChallengeId ? data.challenges.find((challenge) => challenge.id === linkedChallengeId)?.id : null) ??
    data.challenges.find(
      (challenge) =>
        !userSubmissions.some(
          (submission) =>
            submission.challengeId === challenge.id &&
            (submission.status === "submitted" ||
              submission.status === "reviewed" ||
              submission.status === "completed"),
        ),
    )?.id ??
    data.challenges[0]?.id ??
    null;

  const gapRecommendations =
    tier === "se"
      ? recommendChallengesForGaps(dashboard, data.currentUser.id, reviewedIds, 3)
      : [];

  const isSe = tier === "se";

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <SEPageLayout
        eyebrow="Practice · Field scenarios"
        eyebrowColor="#7c3aed"
        fullHeight={isSe}
        headerRight={
          isSe ? (
            <ChallengesHeaderStats challenges={data.challenges} submissions={userSubmissions} />
          ) : undefined
        }
        subtitle="Browse, work, and submit — scalable library with gap recommendations and manager review."
        title="Challenges"
      >
        <Suspense
          fallback={
            <div className="flex h-96 items-center justify-center rounded-2xl border border-stone-200 bg-white text-sm text-stone-500">
              Loading challenges…
            </div>
          }
        >
          {tier !== "se" ? <GapPracticePanel recommendations={gapRecommendations} variant="challenges" /> : null}
          <ChallengesPortal
            challenges={data.challenges}
            gapRecommendations={gapRecommendations}
            initialChallengeId={initialChallengeId}
            isFocused={isFocused}
            showGenerator={tier !== "se"}
            submissions={userSubmissions}
            suppressHeaderStats={isSe}
            tier={tier}
          />
        </Suspense>
      </SEPageLayout>
    </AppShell>
  );
}
