import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DevelopmentPlanPanel } from "@/components/development/development-plan-panel";
import { SEPageLayout } from "@/components/se/se-page-layout";
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
 redirect("/growth-plan");
 }

 return (
 <AppShell currentUser={data.currentUser} notifications={data.notifications}>
 <SEPageLayout
 eyebrow="Annual development"
 subtitle={
 isSe
 ? "Annual goals with quarterly checkpoints. Add evidence; your manager attests progress."
 : "Co-create annual development plans, link competencies, and run Q1–Q4 review cadences that actually stick."
 }
 title={isSe ? "Development" : "Development plans & quarterly reviews"}
 >
 {isSe ? (
 <Link
 className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0071ce] hover:underline"
 href="/growth"
 >
 Career readiness & competency trends <ArrowRight className="h-4 w-4" />
 </Link>
 ) : null}

 <DevelopmentPlanPanel
 assignees={assignees}
 competencies={data.competencies}
 focusReviewId={params.review}
 initialPlan={plan}
 initialSelectedUserId={targetUserId}
 viewerRole={viewerRole}
 />
 </SEPageLayout>
 </AppShell>
 );
}
