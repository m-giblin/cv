import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PlanStepActions } from "@/components/plans/plan-step-actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

 if (step.locked) {
 return (
 <AppShell currentUser={data.currentUser} notifications={data.notifications}>
 <div className="mx-auto max-w-2xl space-y-6">
 <Button asChild size="sm" variant="ghost">
 <Link href="/my-plan">
 <ArrowLeft className="h-4 w-4" />
 Back to my plan
 </Link>
 </Button>
 <Card className="border-stone-200 bg-stone-50/60">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Lock className="h-5 w-5 text-stone-500" />
 {step.title}
 </CardTitle>
 <CardDescription>
 This step is in a later 30-day segment. Complete the prior segment gate and get manager approval to
 unlock segment {step.segmentIndex ?? "?"}
 {plan?.unlockedSegmentMax ? ` (you are on segment ${plan.unlockedSegmentMax})` : ""}.
 </CardDescription>
 </CardHeader>
 </Card>
 </div>
 </AppShell>
 );
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
