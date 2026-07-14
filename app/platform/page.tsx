import { AppShell } from "@/components/app-shell";
import { PlatformConsole } from "@/components/platform/platform-console";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireSuperAdminPageAccess } from "@/lib/auth/require-super-admin-page";

export default async function PlatformPage() {
 const { currentUser } = await requireSuperAdminPageAccess();

 return (
 <AppShell contentWidth="full" currentUser={currentUser} notifications={[]}>
 <SEPageLayout
 eyebrow="Platform operator"
 eyebrowColor="#0033a1"
 subtitle="Create tenants, manage entitlements, and monitor usage across organizations."
 title="Platform console"
 >
 <PlatformConsole />
 </SEPageLayout>
 </AppShell>
 );
}
