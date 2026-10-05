import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { ManagerPageLayout } from "@/components/manager/manager-page-layout";
import { PlanCalendarWorkspace } from "@/components/plans/plan-calendar-workspace";
import { redirect } from "next/navigation";
import { getAccessTier } from "@/lib/auth/rbac";
import { requireAppAccess } from "@/lib/auth/require-access";
import { legacySeRedirect } from "@/lib/se/se-routes";

export default async function PlanCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ se?: string }>;
}) {
  const { data, source, tier } = await requireAppAccess("/plan-calendar");
  const params = await searchParams;
  const { se: previewSeId } = params;

  // SEs: the calendar is now a view of My ramp. Managers and admins keep the team calendar here.
  if (tier === "se") {
    redirect(legacySeRedirect("/plan-calendar", params) ?? "/my-plan?view=calendar");
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
