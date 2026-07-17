import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PlatformConsole } from "@/components/platform/platform-console";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireSuperAdminPageAccess } from "@/lib/auth/require-super-admin-page";

export default async function PlatformPage() {
  const { currentUser } = await requireSuperAdminPageAccess();

  return (
    <AppShell contentWidth="full" currentUser={currentUser} notifications={[]}>
      <SEPageLayout bare>
        <Suspense fallback={<div className="p-6 text-sm text-[#6B6860]">Loading console…</div>}>
          <PlatformConsole />
        </Suspense>
      </SEPageLayout>
    </AppShell>
  );
}
