import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { SeGrowthPlanView } from "@/components/se/growth-plan/SeGrowthPlanView";
import { PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";
import { fetchSeGrowthPlanForUser } from "@/lib/se/fetch-se-growth-plan";

export const metadata = { title: "Growth plan · Readiness" };

export default async function GrowthPlanPage() {
  const { data, source } = await requireAppAccess("/growth-plan");
  const growthPlan = await fetchSeGrowthPlanForUser(data.currentUser.id);

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <DataSourceBanner source={source} />
      <PageHeader eyebrow="Annual goals · quarterly check-ins with your manager" title="Growth plan" />
      <div className="px-[var(--gutter)] pb-7">
        <SeGrowthPlanView initial={growthPlan} seUserId={data.currentUser.id} />
      </div>
    </AppShell>
  );
}
