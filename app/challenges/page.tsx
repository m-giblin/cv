import { FileUp, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ChallengeGenerator } from "@/components/challenge-generator";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/lib/demo-data";

export default function ChallengesPage() {
  const data = getDashboardData("alex");

  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <Badge tone="purple">Dynamic challenges</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Sharpen skills with curated and AI-generated work</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Generate practice tied to SailPoint solutions, submit evidence and reflections, then route the result into manager review and timeline logging.
          </p>
        </section>

        <ChallengeGenerator />

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Challenge library</CardTitle>
              <CardDescription>Curated and AI-generated challenges can be assigned directly or embedded in plan steps.</CardDescription>
            </CardHeader>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.challenges.map((challenge) => (
                <div className="rounded-2xl border border-slate-200 p-4" key={challenge.id}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-950">{challenge.title}</h3>
                    <Badge tone={challenge.isAiGenerated ? "purple" : "blue"}>
                      {challenge.isAiGenerated ? "AI" : "Curated"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{challenge.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {challenge.linkedSolutions.map((solution) => (
                      <Badge key={solution}>{solution}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submission and review workflow</CardTitle>
              <CardDescription>Evidence upload paths are stored in Supabase Storage and reviewed in-app.</CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                <FileUp className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700">Evidence upload placeholder</p>
                <p className="mt-1 text-xs text-slate-500">Store deck links, recordings, screenshots, or demo notes in Supabase Storage.</p>
              </div>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                Reflection
                <Textarea defaultValue="I handled the connector flow well, but I need more precise transform examples." />
              </label>
              <Button className="w-full">
                <ShieldCheck className="h-4 w-4" />
                Submit for manager review
              </Button>
              <div className="space-y-3">
                {data.submissions.map((submission) => {
                  const challenge = data.challenges.find((item) => item.id === submission.challengeId);
                  const person = data.profiles.find((profile) => profile.id === submission.userId);

                  return (
                    <div className="rounded-2xl border border-slate-200 p-4" key={submission.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{challenge?.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{person?.fullName} • AI suggested {submission.aiSuggestedScore ?? "n/a"}</p>
                        </div>
                        <StatusBadge status={submission.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
