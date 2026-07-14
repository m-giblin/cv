import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { ManagerPageLayout } from "@/components/manager/manager-page-layout";
import { PlanCalendarWorkspace } from "@/components/plans/plan-calendar-workspace";
import { SePlanCalendarView } from "@/components/se/se-plan-calendar-view";
import { getAccessTier } from "@/lib/auth/rbac";
import { fetchSePlanCalendarForUser } from "@/lib/se/fetch-se-plan-calendar";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function PlanCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ se?: string }>;
}) {
  const { data, source, tier } = await requireAppAccess("/plan-calendar");
  const { se: previewSeId } = await searchParams;

  if (tier === "se") {
    const calendar = await fetchSePlanCalendarForUser(data.currentUser.id);

    return (
      <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
        <DataSourceBanner source={source} />
        <SePlanCalendarView initial={calendar} />
      </AppShell>
    );
  }

  const orgProfiles =
    tier === "admin"
      ? data.profiles.filter((p) => getAccessTier(p.role) === "se")
      : data.myOrg;

  const orgIds = new Set(orgProfiles.map((p) => p.id));
  const visiblePlans = data.plans.filter((plan) => orgIds.has(plan.userId));
  const initialPreviewUserId =
    previewSeId && orgIds.has(previewSeId) ? previewSeId : null;

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <DataSourceBanner source={source} />
      <ManagerPageLayout
        compact
        eyebrow="Onboarding plans"
        eyebrowColor="#0071ce"
        subtitle="Team ramp Gantt — timeline, month, and team views with AI conflict detection."
        title="Plan Calendar"
      >
        <PlanCalendarWorkspace
          currentUserId={data.currentUser.id}
          initialPreviewUserId={initialPreviewUserId}
          orgProfiles={orgProfiles}
          plans={visiblePlans}
          profiles={data.profiles}
          tier={tier}
        />
      </ManagerPageLayout>
    </AppShell>
  );
}
