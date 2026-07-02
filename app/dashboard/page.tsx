import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  BrainCircuit,
  CalendarClock,
  ClipboardCheck,
  MessageSquareText,
  TrendingUp,
} from "lucide-react";
import { ActivityFeed } from "@/components/activity-feed";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { MetricCard } from "@/components/metric-card";
import { PageHero } from "@/components/page-hero";
import { SeWorkspace } from "@/components/se/se-workspace";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireAppAccess } from "@/lib/auth/require-access";
import { fetchCertificationsForUsers } from "@/lib/data/get-certifications-data";
import { computeCertNextAction } from "@/lib/se/cert-next-action";

export default async function DashboardPage() {
  const { data, source, tier } = await requireAppAccess("/dashboard");

  if (tier === "manager") {
    redirect("/manager");
  }

  if (tier === "se") {
    const userCerts = await fetchCertificationsForUsers([data.currentUser.id]);
    const certNextAction = computeCertNextAction(data.currentUser.level, userCerts);

    return (
      <AppShell currentUser={data.currentUser} notifications={data.notifications}>
        <div className="space-y-6">
          {source === "demo" ? <DataSourceBanner source={source} /> : null}
          <SeWorkspace certNextAction={certNextAction} data={data} />
        </div>
      </AppShell>
    );
  }

  const plan = data.plans.find((item) => item.userId === data.currentUser.id);
  const myActivity = data.activity.filter((item) => item.userId === data.currentUser.id);
  const coachingCards = data.coachingCards.filter((card) => card.userId === data.currentUser.id);
  const openSimulation = data.simulations.find((simulation) => simulation.assignedTo === data.currentUser.id);
  const submittedChallenges = data.submissions.filter((submission) => submission.userId === data.currentUser.id);

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="space-y-8">
        <DataSourceBanner source={source} />

        <PageHero
          actions={
            <>
              <Button asChild>
                <Link href="/challenges">Challenges</Link>
              </Button>
              <Button asChild variant="magenta">
                <Link href="/admin">Admin</Link>
              </Button>
            </>
          }
          description="Administrator overview across enablement activity."
          eyebrow="Admin overview"
          title={`Welcome, ${data.currentUser.fullName.split(" ")[0]}`}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={TrendingUp} label="Plan progress" value={`${plan?.progress ?? 0}%`} helper="Your assigned plan" />
          <MetricCard icon={BrainCircuit} label="Challenges" value={`${submittedChallenges.length}`} helper="Submitted" accent="magenta" />
          <MetricCard icon={Bot} label="Simulations" value={openSimulation ? "1 open" : "0 open"} helper={openSimulation?.persona ?? "None active"} />
          <MetricCard icon={MessageSquareText} label="Coaching cards" value={`${coachingCards.length}`} helper="On record" accent="magenta" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>{plan?.name ?? "Organization plans"}</CardTitle>
              <CardDescription>Admin view of onboarding progress.</CardDescription>
            </CardHeader>
            <CardContent>
              {plan ? (
                <>
                  <Progress value={plan.progress} />
                  <div className="mt-6 space-y-3">
                    {plan.steps.map((step) => (
                      <div className="rounded-2xl border border-sp-blue/10 bg-sp-blue-soft/20 p-4" key={step.id}>
                        <div className="flex justify-between gap-3">
                          <p className="text-sm font-bold text-sp-navy">
                            {step.order}. {step.title}
                          </p>
                          <StatusBadge status={step.status} />
                        </div>
                        {step.dueDate ? (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs text-sp-navy-muted">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Due {step.dueDate}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-sp-navy-muted">Use Plans and Admin to manage assignments.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <ActivityFeed activity={myActivity} profiles={data.profiles} />
          </Card>
        </section>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-sp-blue" />
              <CardTitle>Coaching cards</CardTitle>
            </div>
          </CardHeader>
          <div className="grid gap-4 lg:grid-cols-2">
            {coachingCards.map((card) => (
              <div className="rounded-2xl border border-sp-blue/10 p-4" key={card.id}>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sp-navy">Score {card.score}</p>
                  <Badge tone={card.managerReviewStatus === "reviewed" ? "green" : "amber"}>
                    {card.managerReviewStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
