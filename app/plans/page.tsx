import dynamic from "next/dynamic";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { ManagerPageLayout } from "@/components/manager/manager-page-layout";
import { AssignPlansWorkspace } from "@/components/plans/assign-plans-workspace";
import { getAccessTier, managerTeamDataTier } from "@/lib/auth/rbac";
import { requireAppAccess } from "@/lib/auth/require-access";

const PlanManagementPanel = dynamic(
  () => import("@/components/plans/plan-management").then((mod) => mod.PlanManagementPanel),
  { loading: () => <div className="h-32 animate-pulse bg-[#ECEAE6]" /> },
);

const ReleaseCoursesPanel = dynamic(
  () => import("@/components/corpus/release-courses-panel").then((mod) => mod.ReleaseCoursesPanel),
  { loading: () => <div className="h-32 animate-pulse bg-[#ECEAE6]" /> },
);
const ReleaseLaunchAnalytics = dynamic(
  () => import("@/components/corpus/release-launch-analytics").then((mod) => mod.ReleaseLaunchAnalytics),
  { loading: () => <div className="h-24 animate-pulse bg-[#ECEAE6]" /> },
);

export default async function PlansPage() {
  const { data, source, tier, role } = await requireAppAccess("/plans");

  const teamTier = managerTeamDataTier(tier);

  const assignees =
    teamTier === "admin"
      ? data.profiles.filter((profile) => getAccessTier(profile.role) === "se")
      : data.myOrg;

  const mentors = data.profiles.filter((profile) =>
    ["manager", "mentor", "director", "admin", "senior_se", "basic_se", "advisory_solutions_consultant"].includes(
      profile.role,
    ),
  );

  const visiblePlans =
    teamTier === "admin" ? data.plans : data.plans.filter((plan) => data.myOrg.some((p) => p.id === plan.userId));

  const isManagerView = teamTier === "manager" || tier === "admin";

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <DataSourceBanner source={source} />

      <ManagerPageLayout
        eyebrow="Onboarding plans"
        eyebrowColor="#0071ce"
        subtitle={
          isManagerView
            ? "Drag a plan onto a team member, confirm dates and mentor, then assign."
            : "Build reusable templates, assign plans to SEs, and track step completion."
        }
        title={isManagerView ? "Assign Plans" : "Assignable mentor-supported plans"}
      >
        {isManagerView ? (
          <AssignPlansWorkspace
            assignees={assignees}
            mentors={mentors}
            plans={visiblePlans}
            viewerRole={role}
          />
        ) : (
          <PlanManagementPanel
            assignees={assignees}
            mentors={mentors}
            plans={visiblePlans}
            profiles={data.profiles}
          />
        )}

        {tier === "admin" ? (
          <div className="mt-10 space-y-6">
            <div className="border border-[#E2DFD9] bg-white p-4">
              <p className="font-display text-sm font-extrabold text-[#0D0E12]">Advanced template editor</p>
              <p className="mt-1 text-[11px] text-[#6B6860]">
                Full step configuration with content links, challenges, and simulation templates.
              </p>
            </div>
            <PlanManagementPanel
              assignees={assignees}
              mentors={mentors}
              plans={visiblePlans}
              profiles={data.profiles}
            />
            <ReleaseCoursesPanel assignees={assignees} />
            <ReleaseLaunchAnalytics />
          </div>
        ) : null}
      </ManagerPageLayout>
    </AppShell>
  );
}
