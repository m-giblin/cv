import dynamic from "next/dynamic";
import { CalendarDays, GripVertical, UserCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { PageHeader } from "@/components/page-hero";
import { PlanManagementPanel } from "@/components/plans/plan-management";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getAccessTier } from "@/lib/auth/rbac";
import { requireAppAccess } from "@/lib/auth/require-access";

const ReleaseCoursesPanel = dynamic(
  () => import("@/components/corpus/release-courses-panel").then((mod) => mod.ReleaseCoursesPanel),
  { loading: () => <div className="h-32 animate-pulse rounded-2xl bg-stone-100" /> },
);
const ReleaseLaunchAnalytics = dynamic(
  () => import("@/components/corpus/release-launch-analytics").then((mod) => mod.ReleaseLaunchAnalytics),
  { loading: () => <div className="h-24 animate-pulse rounded-2xl bg-stone-100" /> },
);

export default async function PlansPage() {
  const { data, source, tier } = await requireAppAccess("/plans");

  const assignees =
    tier === "admin"
      ? data.profiles.filter((profile) => getAccessTier(profile.role) === "se")
      : data.myOrg;

  const mentors = data.profiles.filter((profile) =>
    ["manager", "mentor", "director", "admin"].includes(profile.role),
  );

  const visiblePlans =
    tier === "admin" ? data.plans : data.plans.filter((plan) => data.myOrg.some((p) => p.id === plan.userId));

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="space-y-8">
        <DataSourceBanner source={source} />

        <PageHeader
          description={
            tier === "manager"
              ? "Customize templates here. To assign a ramp, use Team overview → Onboarding plans beside your roster."
              : "Build reusable templates, assign plans to SEs, and track step completion through the timeline."
          }
          eyebrow="Onboarding plans"
          title={tier === "manager" ? "Plan template editor" : "Assignable mentor-supported plans"}
        />

        <PlanManagementPanel assignees={assignees} mentors={mentors} />

        {tier === "manager" || tier === "admin" ? (
          <>
            <ReleaseCoursesPanel assignees={assignees} />
            <ReleaseLaunchAnalytics />
          </>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-sp-navy">Active assignments</h2>
          {visiblePlans.length === 0 ? (
            <Card>
              <CardDescription className="p-6">No plan assignments yet. Create a template and assign it above.</CardDescription>
            </Card>
          ) : (
            visiblePlans.map((plan) => {
              const owner = data.profiles.find((profile) => profile.id === plan.userId);
              const mentor = data.profiles.find((profile) => profile.id === plan.mentorId);

              return (
                <Card key={plan.id}>
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {owner?.fullName ?? "Unassigned"} • Mentor: {mentor?.fullName ?? "None"}
                      </CardDescription>
                    </div>
                    <StatusBadge status={plan.status} />
                  </div>
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between text-sm text-sp-navy-muted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {plan.startDate} to {plan.targetCompletion}
                      </span>
                      <span className="font-bold text-sp-navy">{plan.progress}%</span>
                    </div>
                    <Progress value={plan.progress} />
                  </div>
                  <div className="mt-5 space-y-3">
                    {plan.steps.map((step) => (
                      <div className="flex items-start gap-3 rounded-2xl border border-sp-blue/10 bg-sp-blue-soft/15 p-4" key={step.id}>
                        <GripVertical className="mt-1 h-4 w-4 text-sp-blue/30" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                            <div>
                              <p className="text-sm font-bold text-sp-navy">{step.title}</p>
                              <p className="mt-1 text-xs uppercase tracking-wide text-sp-blue/70">
                                {step.type.replaceAll("_", " ")}
                              </p>
                            </div>
                            <StatusBadge status={step.status} />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-sp-navy-muted">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })
          )}
        </section>

        <Card>
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-sp-blue-soft p-3 text-sp-blue">
              <UserCheck className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Progress automation</CardTitle>
              <CardDescription className="mt-2">
                Challenge reviews mark plan steps complete and recalculate progress automatically.
              </CardDescription>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
