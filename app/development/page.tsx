import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DevelopmentPlanPanel } from "@/components/development/development-plan-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getAccessTier } from "@/lib/auth/rbac";
import { requireAppAccess } from "@/lib/auth/require-access";
import { fetchDevelopmentPlanForUser } from "@/lib/data/get-development-data";

type DevelopmentPageProps = {
 searchParams: Promise<{ profile?: string; review?: string }>;
};

export default async function DevelopmentPage({ searchParams }: DevelopmentPageProps) {
 const { data, tier } = await requireAppAccess("/development");
 const params = await searchParams;

 const viewerRole = tier === "se" ? "se" : tier === "manager" ? "manager" : "admin";
 const defaultManagerTarget = data.myOrg[0]?.id ?? data.currentUser.id;
 const targetUserId =
 params.profile && tier !== "se"
 ? params.profile
 : tier === "se"
 ? data.currentUser.id
 : defaultManagerTarget;

 const plan = await fetchDevelopmentPlanForUser(targetUserId);

 const assignees =
 tier === "se"
 ? [data.currentUser]
 : tier === "admin"
 ? data.profiles.filter((profile) => getAccessTier(profile.role) === "se")
 : data.myOrg;

 const isSe = tier === "se";

 if (isSe) {
 redirect("/readiness/growth-plan");
 }

 return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <PageHeader eyebrow="Annual goals · quarterly reviews" title="Development plans" />
      <div className="px-[var(--gutter)] pb-7">
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
