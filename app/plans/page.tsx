import { CalendarDays, GripVertical, Plus, UserCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { getDashboardData } from "@/lib/demo-data";

export default function PlansPage() {
  const data = getDashboardData("priya");

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Badge tone="blue">Onboarding plans</Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Assignable mentor-supported plans</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Create reusable plan templates, assign mentors, and track step completion automatically through timeline events.
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4" />
            New template
          </Button>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Plan builder draft</CardTitle>
              <CardDescription>A lightweight MVP form that can become a drag-and-drop builder later.</CardDescription>
            </CardHeader>
            <form className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                Plan name
                <Input defaultValue="Basic SE 90-Day Identity Security Ramp" />
              </label>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                Description
                <Textarea defaultValue="Standardized onboarding path for new SEs with content review, demo practice, simulation, and mentor gates." />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  Assign to
                  <Input defaultValue="Alex Rivera" />
                </label>
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  Mentor
                  <Input defaultValue="Sam Nguyen" />
                </label>
              </div>
              <Button type="submit" className="w-full">
                Save plan assignment
              </Button>
            </form>
          </Card>

          <div className="space-y-4">
            {data.plans.map((plan) => {
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
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {plan.startDate} to {plan.targetCompletion}
                      </span>
                      <span className="font-semibold text-slate-950">{plan.progress}%</span>
                    </div>
                    <Progress value={plan.progress} />
                  </div>
                  <div className="mt-5 space-y-3">
                    {plan.steps.map((step) => (
                      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4" key={step.id}>
                        <GripVertical className="mt-1 h-4 w-4 text-slate-300" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">{step.title}</p>
                              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{step.type.replaceAll("_", " ")}</p>
                            </div>
                            <StatusBadge status={step.status} />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <Card>
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <UserCheck className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Progress automation</CardTitle>
              <CardDescription className="mt-2">
                Step completion writes to `activity_logs`, recalculates `plan_assignments.progress_percent`, and becomes visible through hierarchy-protected manager queries.
              </CardDescription>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
