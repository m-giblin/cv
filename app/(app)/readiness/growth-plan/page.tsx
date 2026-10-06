import { DataSourceBanner } from "@/components/data-source-banner";
import { ReadinessTabs } from "@/components/growth/readiness-tabs";
import { SeGrowthPlanView } from "@/components/se/growth-plan/SeGrowthPlanView";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";
import { fetchSeGrowthPlanForUser } from "@/lib/se/fetch-se-growth-plan";
import { feedbackItemCount } from "@/lib/se/readiness-tabs";

export const metadata = { title: "Growth plan · Readiness" };

export default async function GrowthPlanPage() {
  const { data, source } = await requireAppAccess("/growth-plan");
  const growthPlan = await fetchSeGrowthPlanForUser(data.currentUser.id);

  return (
    <>
      <DataSourceBanner source={source} />
      <PageHeader
        accent="The year, one quarter at a time."
        eyebrow="Readiness"
        subtitle="Annual goals with a quarterly check-in with your manager."
        title="Growth plan."
      />
      <PageBody className="flex flex-col gap-[22px] pb-7">
        <ReadinessTabs feedbackCount={feedbackItemCount(data)} value="growth-plan" />
        <SeGrowthPlanView initial={growthPlan} seUserId={data.currentUser.id} />
      </PageBody>
    </>
  );
}
