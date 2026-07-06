import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { ManagerPageLayout } from "@/components/manager/manager-page-layout";
import { PlanManagementPanel } from "@/components/plans/plan-management";
import { getAccessTier } from "@/lib/auth/rbac";
import { requireAppAccess } from "@/lib/auth/require-access";

const ReleaseCoursesPanel = dynamic(
  () => import("@/components/corpus/release-courses-panel").then((mod) => mod.ReleaseCoursesPanel),
  { loading: () => <div className="h-32 animate-pulse rounded-xl bg-[#f1f5f9]" /> },
);
const ReleaseLaunchAnalytics = dynamic(
  () => import("@/components/corpus/release-launch-analytics").then((mod) => mod.ReleaseLaunchAnalytics),
  { loading: () => <div className="h-24 animate-pulse rounded-xl bg-[#f1f5f9]" /> },
);

export default async function PlansPage() {
  const { data, source, tier } = await requireAppAccess("/plans");

  const assignees =
    tier === "admin"
      ? data.profiles.filter((profile) => getAccessTier(profile.role) === "se")
      : data.myOrg;

  const mentors = data.profiles.filter((profile) =>
    ["manager", "mentor", "director", "admin"].includes(profile.role),
  );

  const visiblePlans =
    tier === "admin" ? data.plans : data.plans.filter((plan) => data.myOrg.some((p) => p.id === plan.userId));

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <DataSourceBanner source={source} />

      <ManagerPageLayout
        eyebrow="Onboarding plans"
        subtitle={
          tier === "manager"
            ? "Customize templates here. To assign a ramp, use Team Roster → Onboarding plans."
            : "Build reusable templates, assign plans to SEs, and track step completion."
        }
        title={tier === "manager" ? "Plan template editor" : "Assignable mentor-supported plans"}
      >
        <PlanManagementPanel
          assignees={assignees}
          mentors={mentors}
          plans={visiblePlans}
          profiles={data.profiles}
        />

        {tier === "manager" || tier === "admin" ? (
          <div className="mt-8 space-y-6">
            <ReleaseCoursesPanel assignees={assignees} />
            <ReleaseLaunchAnalytics />
          </div>
        ) : null}
      </ManagerPageLayout>
    </AppShell>
  );
}
