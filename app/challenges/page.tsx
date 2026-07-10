import { Suspense } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ChallengesShell } from "@/components/challenges/challenges-shell";
import { recommendChallengesForGaps } from "@/lib/challenges/gap-recommendations";
import { requireChallengesPageAccess } from "@/lib/auth/require-access";

type ChallengesPageProps = {
  searchParams: Promise<{ focus?: string; step?: string; challenge?: string; view?: string; test?: string }>;
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
    tier === "se" ? recommendChallengesForGaps(dashboard, data.currentUser.id, reviewedIds, 3) : [];

  const testMode = tier === "admin" && params.test === "1";

  return (
    <AppShell contentWidth="full" currentUser={data.currentUser} notifications={data.notifications}>
      {testMode ? (
        <div className="flex items-center justify-between gap-3 border-b border-[#D4810A]/30 bg-[#FFFBF0] px-5 py-2">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#D4810A]">
            Test as SE — validating scoring, personas, and coaching flow
          </p>
          <Link className="font-mono text-[10px] font-semibold text-[#D4810A] hover:underline" href="/admin">
            Exit test mode
          </Link>
        </div>
      ) : null}
      <Suspense
        fallback={
          <div className="flex h-96 items-center justify-center border border-[#E2DFD9] bg-white text-sm text-[#A09D98]">
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
