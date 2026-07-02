import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PlanStepActions } from "@/components/plans/plan-step-actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requireAppAccess } from "@/lib/auth/require-access";

type PlanStepPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlanStepPage({ params }: PlanStepPageProps) {
  const { id } = await params;
  const { data } = await requireAppAccess("/plan-steps");

  const plan = data.plans.find((item) => item.userId === data.currentUser.id);
  const step = plan?.steps.find((item) => item.assignmentStepId === id);

  if (!step) {
    notFound();
  }

  const mentor = plan?.mentorId
    ? data.profiles.find((profile) => profile.id === plan.mentorId)
    : undefined;

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Button asChild size="sm" variant="ghost">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={step.status} />
          {step.dueDate ? (
            <span className="text-xs text-sp-navy-muted">Due {step.dueDate}</span>
          ) : null}
        </div>

        <PlanStepActions mentorName={mentor?.fullName} step={step} />
      </div>
    </AppShell>
  );
}
