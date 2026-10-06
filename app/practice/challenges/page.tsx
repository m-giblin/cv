import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ChallengesShell } from "@/components/challenges/challenges-shell";
import { requireChallengesPageAccess } from "@/lib/auth/require-access";
import { recommendChallengesForGaps } from "@/lib/challenges/gap-recommendations";

type ChallengesPageProps = {
  searchParams: Promise<{ focus?: string; step?: string; challenge?: string; view?: string; test?: string }>;
};

export const metadata = { title: "Challenges · Practice" };

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
    tier === "se" ? recommendChallengesForGaps(dashboard, data.currentUser.id, reviewedIds, 3) : [];

  const testMode = tier === "admin" && params.test === "1";

  return (
    <AppShell contentWidth="full" currentUser={data.currentUser} notifications={data.notifications}>
      <Suspense
        fallback={
          <div className="m-[var(--gutter)] rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted">
            Loading challenges…
          </div>
        }
      >
        <ChallengesShell
          challenges={data.challenges}
          gapRecommendations={gapRecommendations}
          initialChallengeId={initialChallengeId}
          isFocused={isFocused}
          showGenerator={tier !== "se"}
          submissions={userSubmissions}
          testMode={testMode}
          tier={tier}
        />
      </Suspense>
    </AppShell>
  );
}
