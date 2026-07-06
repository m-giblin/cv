import { AppShell } from "@/components/app-shell";
import { CompetencyFlightCheck } from "@/components/assessments/competency-flight-check";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function FlightCheckPage() {
  const { data } = await requireAppAccess("/flight-check");

  return (
    <AppShell contentWidth="full" currentUser={data.currentUser} notifications={data.notifications}>
      <SEPageLayout
        eyebrow="Assessment · Adaptive"
        eyebrowColor="#0891b2"
        subtitle="Adaptive multi-modal assessment — difficulty adjusts to your coaching gaps, then auto-assigns practice tied to ramp and manager review."
        title="Competency Flight Check"
      >
        <CompetencyFlightCheck />
      </SEPageLayout>
    </AppShell>
  );
}
