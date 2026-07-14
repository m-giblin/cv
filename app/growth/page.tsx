import { AppShell } from "@/components/app-shell";
import { GrowthDashboardNorthstar } from "@/components/growth/growth-dashboard-northstar";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function GrowthPage() {
 const { data } = await requireAppAccess("/growth");

 return (
 <AppShell currentUser={data.currentUser} notifications={data.notifications}>
 <SEPageLayout
 eyebrow="Career"
 subtitle="Competency trends, career progression, and recommended practice"
 title="My Growth"
 >
 <GrowthDashboardNorthstar data={data} />
 </SEPageLayout>
 </AppShell>
 );
}
