import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { SeWorkspaceNorthstar } from "@/components/se/se-workspace-northstar";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { getHomeRoute } from "@/lib/auth/rbac";
import { requireDashboardPageAccess } from "@/lib/auth/require-access";
import { fetchCertificationsForUsers } from "@/lib/data/get-certifications-data";
import { computeCertNextAction } from "@/lib/se/cert-next-action";

export default async function DashboardPage() {
 const { data, source, tier } = await requireDashboardPageAccess();

 if (tier === "manager") {
 redirect("/manager?section=command");
 }

 if (tier === "admin") {
 redirect("/admin?tab=overview");
 }

 if (tier === "se") {
 const userCerts = await fetchCertificationsForUsers([data.currentUser.id]);
 const certNextAction = computeCertNextAction(data.currentUser.level, userCerts);
 const approvedCertCount = userCerts.filter((cert) => cert.status === "approved").length;

 return (
 <AppShell currentUser={data.currentUser} notifications={data.notifications}>
 <SEPageLayout bare>
 <DataSourceBanner source={source} />
 <SeWorkspaceNorthstar
 approvedCertCount={approvedCertCount}
 certNextAction={certNextAction}
 data={data}
 />
 </SEPageLayout>
 </AppShell>
 );
 }

 redirect(getHomeRoute(tier));
}
