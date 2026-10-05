import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PlatformConsole } from "@/components/platform/platform-console";
import { Spinner } from "@/components/platform/platform-ui";
import { requireSuperAdminPageAccess } from "@/lib/auth/require-super-admin-page";

export async function PlatformSectionPage() {
  const { currentUser } = await requireSuperAdminPageAccess();

  return (
    <AppShell contentWidth="full" currentUser={currentUser} notifications={[]}>
      <Suspense fallback={<Spinner label="Loading console" />}>
        <PlatformConsole />
      </Suspense>
    </AppShell>
  );
}
