import { AlertTriangle, BarChart3, ClipboardList, Network, Users } from "lucide-react";
import { ActivityFeed } from "@/components/activity-feed";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PersonSummaryCard } from "@/components/person-summary-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDashboardData } from "@/lib/demo-data";

export default function ManagerPage() {
  const data = getDashboardData("priya");
  const orgIds = new Set(data.myOrg.map((profile) => profile.id));
  const orgPlans = data.plans.filter((plan) => orgIds.has(plan.userId));
  const orgActivity = data.activity.filter((item) => orgIds.has(item.userId));
  const openReviews = data.submissions.filter(
    (submission) => orgIds.has(submission.userId) && submission.status === "submitted",
  );
  const pendingCards = data.coachingCards.filter(
    (card) => orgIds.has(card.userId) && card.managerReviewStatus === "pending",
  );
  const averageProgress = orgPlans.length
    ? Math.round(orgPlans.reduce((total, plan) => total + plan.progress, 0) / orgPlans.length)
    : 0;

  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <Badge tone="blue">Hierarchy-aware manager dashboard</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Team progress and review queue</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            View direct reports and recursive org members, inspect onboarding progress, and focus review time on the highest-value coaching moments.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Users} label="Org members" value={`${data.myOrg.length}`} helper="Direct reports plus subtree" />
          <MetricCard icon={BarChart3} label="Average progress" value={`${averageProgress}%`} helper="Active onboarding plans" />
          <MetricCard icon={ClipboardList} label="Submissions" value={`${openReviews.length}`} helper="Awaiting manager review" />
          <MetricCard icon={AlertTriangle} label="Coaching cards" value={`${pendingCards.length}`} helper="Pending review comments" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-slate-950">My org</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.myOrg.map((profile) => {
                const plan = data.plans.find((item) => item.userId === profile.id);
                const reviews = openReviews.filter((review) => review.userId === profile.id).length
                  + pendingCards.filter((card) => card.userId === profile.id).length;

                return (
                  <PersonSummaryCard
                    href={`/manager?profile=${profile.id}`}
                    key={profile.id}
                    openReviews={reviews}
                    plan={plan}
                    profile={profile}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Growth signals</CardTitle>
                <CardDescription>Aggregated coaching-card competency gaps in this subtree.</CardDescription>
              </CardHeader>
              <div className="space-y-4">
                {[
                  { label: "Discovery before solutioning", value: 68 },
                  { label: "ISC workflows and forms fluency", value: 74 },
                  { label: "Executive demo storytelling", value: 82 },
                  { label: "Shadow AI objection handling", value: 61 },
                ].map((signal) => (
                  <div key={signal.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{signal.label}</span>
                      <span className="text-slate-500">{signal.value}%</span>
                    </div>
                    <Progress value={signal.value} />
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review queue</CardTitle>
                <CardDescription>Submissions and coaching cards that need manager action.</CardDescription>
              </CardHeader>
              <div className="space-y-3">
                {[...openReviews, ...pendingCards].map((item) => {
                  const person = data.profiles.find((profile) => profile.id === item.userId);
                  const isCard = "score" in item;

                  return (
                    <div className="rounded-2xl border border-slate-200 p-4" key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {person?.fullName ?? "Unknown SE"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {isCard ? `Simulation coaching card • score ${item.score}` : "Challenge submission"}
                          </p>
                        </div>
                        <Badge tone="amber">review</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Org timeline</CardTitle>
            <CardDescription>Recent progress events across the visible subtree.</CardDescription>
          </CardHeader>
          <ActivityFeed activity={orgActivity} profiles={data.profiles} />
        </Card>
      </div>
    </AppShell>
  );
}
