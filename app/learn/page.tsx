import { AppShell } from "@/components/app-shell";
import { LearnPageNorthstar } from "@/components/learn/learn-page-northstar";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function LearnPage() {
  const { data } = await requireAppAccess("/learn");

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <SEPageLayout
        eyebrow="Enablement"
        subtitle="SailPoint's 2026 story: GenAI assists people; Agentic AI acts — and every agent needs identity governance. Study before customer calls."
        title="Learn: GenAI vs Agentic AI"
      >
        <LearnPageNorthstar />
      </SEPageLayout>
    </AppShell>
  );
}
