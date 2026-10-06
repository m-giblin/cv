import { redirect } from "next/navigation";

type PlanStepPageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy route: step detail now opens in place inside My ramp. */
export default async function PlanStepPage({ params }: PlanStepPageProps) {
  const { id } = await params;
  redirect(`/my-plan?step=${encodeURIComponent(id)}`);
}
