import type { ReactNode } from "react";
import { AppShellView } from "@/components/app-shell-view";
import { loadShellData } from "@/lib/shell/load-shell-data";

/**
 * Persistent shell for every signed-in page. Next keeps this layout mounted during client
 * navigation, so the top bar, sidebar and their data load once instead of on every click.
 */
export default async function SignedInLayout({ children }: { children: ReactNode }) {
  const shell = await loadShellData();

  // Middleware sends signed-out users to sign-in; this only covers a missing profile.
  if (!shell) return <>{children}</>;

  return (
    <AppShellView
      assistantEnabled={shell.assistantEnabled}
      branding={shell.branding}
      currentUser={shell.currentUser}
      forgeEnabled={shell.forgeEnabled}
      navCounts={shell.menteeCount > 0 ? { mentoring: shell.menteeCount } : undefined}
      notifications={shell.notifications}
      people={shell.people}
      shadowMode={shell.shadowMode}
      shadowTenantName={shell.shadowTenantName}
      workspaceCookie={shell.workspaceCookie}
      workspaceHats={shell.workspaceHats}
    >
      {children}
    </AppShellView>
  );
}
