import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { DealPrepPanel } from "@/components/deal-prep/deal-prep-panel";
import { PageHeader } from "@/components/page-hero";
import { requireAppAccess } from "@/lib/auth/require-access";
import { profileLevelLabel } from "@/lib/utils/level-label";

export default async function PrepPage() {
  const { data, source } = await requireAppAccess("/prep");

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="space-y-8">
        <DataSourceBanner source={source} />
        <PageHeader
          description="Account-specific prep before customer calls — objections, discovery questions, and talk track."
          eyebrow="Deal prep"
          title="AI prep for real moments"
          tone="magenta"
        />
        <DealPrepPanel userLevel={profileLevelLabel(data.currentUser)} />
      </div>
    </AppShell>
  );
}
