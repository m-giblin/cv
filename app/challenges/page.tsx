import { FileUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ChallengeGenerator } from "@/components/challenge-generator";
import { ChallengeSubmissionForm } from "@/components/challenges/submission-form";
import { DataSourceBanner } from "@/components/data-source-banner";
import { PageHeader } from "@/components/page-hero";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppAccess } from "@/lib/auth/require-access";

type ChallengesPageProps = {
  searchParams: Promise<{ focus?: string; step?: string; challenge?: string }>;
};

export default async function ChallengesPage({ searchParams }: ChallengesPageProps) {
  const { data, source, tier } = await requireAppAccess("/challenges");
  const params = await searchParams;
  const isFocused = params.focus === "challenge";

  const userSubmissions =
    tier === "se"
      ? data.submissions.filter((submission) => submission.userId === data.currentUser.id)
      : data.submissions;

  const plan = data.plans.find((item) => item.userId === data.currentUser.id);
  const linkedStep = params.step ? plan?.steps.find((step) => step.id === params.step) : undefined;
  const linkedChallengeId = params.challenge ?? linkedStep?.challengeId;

  const activeChallenge =
    (linkedChallengeId ? data.challenges.find((challenge) => challenge.id === linkedChallengeId) : null) ??
    data.challenges.find(
      (challenge) =>
        !userSubmissions.some(
          (submission) =>
            submission.challengeId === challenge.id &&
            (submission.status === "submitted" || submission.status === "reviewed" || submission.status === "completed"),
        ),
    ) ??
    data.challenges[0];

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="space-y-8">
        <DataSourceBanner source={source} />

        <PageHeader
          description={
            tier === "se"
              ? isFocused
                ? "Complete this plan step — submit evidence and reflection for manager review."
                : "Generate practice tied to your plan, submit evidence, and send to your manager for review."
              : "Generate practice tied to SailPoint solutions, submit evidence and reflections, then route the result into manager review and timeline logging."
          }
          eyebrow={tier === "se" ? "Your practice" : "Dynamic challenges"}
          title={tier === "se" ? "Sharpen your skills" : "Sharpen skills with curated and AI-generated work"}
          tone="magenta"
        />

        {tier !== "se" ? <ChallengeGenerator showSave /> : null}

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Challenge library</CardTitle>
              <CardDescription>Curated and AI-generated challenges can be assigned directly or embedded in plan steps.</CardDescription>
            </CardHeader>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.challenges.map((challenge) => (
                <div className="rounded-2xl border border-sp-blue/10 bg-gradient-to-br from-white to-sp-magenta-soft/30 p-4" key={challenge.id}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-sp-navy">{challenge.title}</h3>
                    <Badge tone={challenge.isAiGenerated ? "magenta" : "blue"}>
                      {challenge.isAiGenerated ? "AI" : "Curated"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-sp-navy-muted">{challenge.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {challenge.linkedSolutions.map((solution) => (
                      <Badge key={solution}>{solution}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className={isFocused ? "ring-2 ring-sp-magenta/30" : undefined}>
            <CardHeader>
              <CardTitle>Submit for review</CardTitle>
              <CardDescription>
                Add an evidence link and reflection. Your manager receives a notification when you submit.
              </CardDescription>
            </CardHeader>
            <div className="space-y-4">
              {activeChallenge ? (
                <>
                  <div className="rounded-2xl border border-sp-blue/15 bg-sp-blue-soft/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sp-blue">Active challenge</p>
                    <p className="mt-1 text-sm font-bold text-sp-navy">{activeChallenge.title}</p>
                  </div>
                  <ChallengeSubmissionForm challengeId={activeChallenge.id} />
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-sp-blue/25 bg-sp-blue-soft/30 p-5 text-center">
                  <FileUp className="mx-auto h-8 w-8 text-sp-blue" />
                  <p className="mt-3 text-sm font-semibold text-sp-navy">No challenges available yet</p>
                  <p className="mt-1 text-xs text-sp-navy-muted">Ask your manager to assign a challenge or check back after enablement publishes content.</p>
                </div>
              )}

              {userSubmissions.length > 0 ? (
                <div className="space-y-3 border-t border-sp-blue/10 pt-4">
                  <p className="text-sm font-semibold text-sp-navy">Your submissions</p>
                  {userSubmissions.map((submission) => {
                    const challenge = data.challenges.find((item) => item.id === submission.challengeId);

                    return (
                      <div className="rounded-2xl border border-sp-blue/10 p-4" key={submission.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-sp-navy">{challenge?.title ?? "Challenge"}</p>
                            <p className="mt-1 text-xs text-sp-navy-muted">
                              Submitted {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : "recently"}
                            </p>
                          </div>
                          <StatusBadge status={submission.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
