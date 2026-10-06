import { Suspense } from "react";
import { PlatformConsole } from "@/components/platform/platform-console";
import { Spinner } from "@/components/platform/platform-ui";
import { requireSuperAdminPageAccess } from "@/lib/auth/require-super-admin-page";

export async function PlatformSectionPage() {
  await requireSuperAdminPageAccess();

  return (
    <>
      <Suspense fallback={<Spinner label="Loading console" />}>
        <PlatformConsole />
      </Suspense>
    </>
  );
}
