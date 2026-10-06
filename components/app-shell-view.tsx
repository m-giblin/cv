"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { CSSProperties, ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { SidebarContent, type SidebarPerson } from "@/components/nav/app-sidebar";
import { CommandPalette } from "@/components/nav/command-palette";
import { TopBar } from "@/components/nav/top-bar";
import { useNavFlags } from "@/components/nav/use-nav-flags";
import { ShadowTenantBanner } from "@/components/platform/shadow-tenant-banner";
import { TenantBrandingProvider } from "@/components/tenant/tenant-branding-provider";
import { UatBugTracker } from "@/components/uat/uat-bug-tracker";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { AccessTier } from "@/lib/auth/rbac";
import type { WorkspaceHat } from "@/lib/auth/workspace";
import { pageTitle, paletteEntries } from "@/lib/navigation/nav-model";
import type { TenantShellBranding } from "@/lib/tenant/shell-branding";
import { PRODUCT_NAME } from "@/lib/tenant/shell-branding-shared";
import { Notification, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function DocumentTitle({ workspace }: { workspace: WorkspaceHat }) {
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    document.title = pageTitle(workspace, pathname, params, PRODUCT_NAME);
  }, [workspace, pathname, params]);

  return null;
}

function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div aria-hidden className="absolute inset-0 bg-scrim" onClick={onClose} />
      <div
        aria-label="Navigation"
        aria-modal="true"
        className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] overflow-y-auto border-r border-line bg-white"
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

export function AppShellView({
  children,
  currentUser,
  notifications,
  contentWidth = "default",
  workspace,
  workspaceHats,
  shadowTenantName,
  shadowMode,
  branding,
  people,
  navCounts,
  forgeEnabled = false,
}: {
  children: ReactNode;
  currentUser: Profile;
  notifications: Notification[];
  contentWidth?: "default" | "wide" | "full";
  tier: AccessTier;
  workspace: WorkspaceHat;
  workspaceHats: WorkspaceHat[];
  shadowTenantName: string | null;
  shadowMode: "admin" | "manager" | "se" | null;
  branding: TenantShellBranding;
  people?: SidebarPerson[];
  navCounts?: Record<string, string | number>;
  forgeEnabled?: boolean;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const flags = useNavFlags(workspace);
  const entries = useMemo(() => paletteEntries(workspace, flags), [workspace, flags]);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const myNotifications = notifications.filter((item) => item.userId === currentUser.id);
  const shellStyle = { "--tenant-primary": branding.primaryColor } as CSSProperties;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      } else if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sidebar = (onNavigate?: () => void) => (
    <Suspense fallback={null}>
      <SidebarContent
        counts={navCounts}
        flags={flags}
        notifications={myNotifications}
        onNavigate={onNavigate}
        people={workspace === "se" ? people : undefined}
        workspace={workspace}
      />
    </Suspense>
  );

  return (
    <TenantBrandingProvider branding={branding}>
      <div className="min-h-screen bg-bg" style={shellStyle}>
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-signal focus:px-4 focus:py-2 focus:text-ink"
          href="#main-content"
        >
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <DocumentTitle workspace={workspace} />
        </Suspense>

        <TopBar
          currentUser={currentUser}
          menuOpen={drawerOpen}
          notifications={myNotifications}
          onOpenMenu={() => setDrawerOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          workspace={workspace}
          workspaceHats={workspaceHats}
        />

        <MobileDrawer onClose={closeDrawer} open={drawerOpen}>
          {workspaceHats.length > 1 ? (
            <div className="border-b border-line bg-blue px-6 py-4 sm:hidden">
              <WorkspaceSwitcher activeHat={workspace} hats={workspaceHats} />
            </div>
          ) : null}
          {sidebar(closeDrawer)}
        </MobileDrawer>

        <div className="flex">
          <aside className="sticky top-[var(--topbar-height)] hidden h-[calc(100vh-var(--topbar-height))] w-[var(--sidebar-width)] shrink-0 overflow-y-auto border-r border-line bg-white lg:block">
            {sidebar()}
          </aside>

          <div className="min-w-0 flex-1">
            {shadowTenantName && shadowMode ? (
              <ShadowTenantBanner mode={shadowMode} tenantName={shadowTenantName} />
            ) : null}
            <main
              className={cn(
                "pb-7 outline-none",
                contentWidth === "full"
                  ? "w-full"
                  : contentWidth === "wide"
                    ? "mx-auto w-full max-w-[1600px]"
                    : "mx-auto w-full max-w-[1400px]",
              )}
              id="main-content"
              tabIndex={-1}
            >
              {children}
            </main>
            <UatBugTracker
              enabled={forgeEnabled}
              reporterEmail={currentUser.email}
              reporterName={currentUser.fullName}
            />
          </div>
        </div>

        <CommandPalette entries={entries} onClose={() => setPaletteOpen(false)} open={paletteOpen} />
      </div>
    </TenantBrandingProvider>
  );
}
