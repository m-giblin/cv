import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { SeGrowthPlanView } from "@/components/se/growth-plan/SeGrowthPlanView";
import { fetchSeGrowthPlanForUser } from "@/lib/se/fetch-se-growth-plan";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function GrowthPlanPage() {
  const { data, source } = await requireAppAccess("/growth-plan");
  const growthPlan = await fetchSeGrowthPlanForUser(data.currentUser.id);

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <DataSourceBanner source={source} />
      <SeGrowthPlanView initial={growthPlan} seUserId={data.currentUser.id} />
    </AppShell>
  );
}
