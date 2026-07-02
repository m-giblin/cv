import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { DevelopmentPlanPanel } from "@/components/development/development-plan-panel";
import { PageHeader } from "@/components/page-hero";
import { getAccessTier } from "@/lib/auth/rbac";
import { requireAppAccess } from "@/lib/auth/require-access";
import { fetchDevelopmentPlanForUser } from "@/lib/data/get-development-data";

type DevelopmentPageProps = {
  searchParams: Promise<{ profile?: string; review?: string }>;
};

export default async function DevelopmentPage({ searchParams }: DevelopmentPageProps) {
  const { data, source, tier } = await requireAppAccess("/development");
  const params = await searchParams;

  const viewerRole = tier === "se" ? "se" : tier === "manager" ? "manager" : "admin";
  const targetUserId =
    params.profile && tier !== "se" ? params.profile : data.currentUser.id;

  const plan = await fetchDevelopmentPlanForUser(targetUserId);

  const assignees =
    tier === "se"
      ? [data.currentUser]
      : tier === "admin"
        ? data.profiles.filter((profile) => getAccessTier(profile.role) === "se")
        : data.myOrg;

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="space-y-8">
        <DataSourceBanner source={source} />

        <PageHeader
          description={
            tier === "se"
              ? "Your annual goals with quarterly checkpoints. Add evidence each quarter; your manager attests progress."
              : "Co-create annual development plans, link competencies, and run Q1–Q4 review cadences that actually stick."
          }
          eyebrow="Annual development"
          title={tier === "se" ? "Your growth plan" : "Development plans & quarterly reviews"}
          tone="magenta"
        />

        <DevelopmentPlanPanel
          assignees={assignees}
          competencies={data.competencies}
          focusReviewId={params.review}
          initialPlan={plan}
          initialSelectedUserId={targetUserId}
          viewerRole={viewerRole}
        />
      </div>
    </AppShell>
  );
}
