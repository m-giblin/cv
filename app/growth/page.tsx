import { AppShell } from "@/components/app-shell";
import { GrowthDashboard } from "@/components/growth/growth-dashboard";
import { PageHeader } from "@/components/page-hero";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function GrowthPage() {
  const { data } = await requireAppAccess("/growth");

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="space-y-8">
        <PageHeader
          description="Competency trends, certification progress, career ladder, and recommended practice — your long-term growth view."
          eyebrow="Career growth"
          title="My growth"
          tone="magenta"
        />
        <GrowthDashboard data={data} />
      </div>
    </AppShell>
  );
}
