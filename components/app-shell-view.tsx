"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { CSSProperties, ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { CommandPalette } from "@/components/nav/command-palette";
import { SidebarBrand, SidebarContent } from "@/components/nav/app-sidebar";
import { SectionTabs } from "@/components/nav/section-tabs";
import { useNavFlags } from "@/components/nav/use-nav-flags";
import { NotificationFlyout } from "@/components/notifications/notification-flyout";
import { ShadowTenantBanner } from "@/components/platform/shadow-tenant-banner";
import {
  TenantBrandingProvider,
  useTenantBranding,
} from "@/components/tenant/tenant-branding-provider";
import { UatBugTracker } from "@/components/uat/uat-bug-tracker";
import type { AccessTier } from "@/lib/auth/rbac";
import type { WorkspaceHat } from "@/lib/auth/workspace";
import { pageTitle, paletteEntries } from "@/lib/navigation/nav-model";
import type { TenantShellBranding } from "@/lib/tenant/shell-branding";
import { Notification, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function DocumentTitle({ workspace }: { workspace: WorkspaceHat }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { productName } = useTenantBranding();

  useEffect(() => {
    document.title = pageTitle(workspace, pathname, params, productName);
  }, [workspace, pathname, params, productName]);

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
      <div aria-hidden className="absolute inset-0 bg-[rgba(10,26,63,0.25)]" onClick={onClose} />
      <div
        aria-label="Navigation"
        aria-modal="true"
        className="absolute inset-y-0 left-0 w-[260px] max-w-[85vw] overflow-y-auto bg-blue"
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sidebar = (onNavigate?: () => void) => (
    <Suspense fallback={null}>
      <SidebarContent
        currentUser={currentUser}
        flags={flags}
        notifications={notifications}
        onNavigate={onNavigate}
        onOpenPalette={() => {
          onNavigate?.();
          setPaletteOpen(true);
        }}
        workspace={workspace}
        workspaceHats={workspaceHats}
      />
    </Suspense>
  );

  return (
    <TenantBrandingProvider branding={branding}>
      <div className="design-northstar min-h-screen bg-bg" style={shellStyle}>
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-signal focus:px-4 focus:py-2 focus:text-ink"
          href="#main-content"
        >
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <DocumentTitle workspace={workspace} />
        </Suspense>

        {shadowTenantName && shadowMode ? (
          <ShadowTenantBanner mode={shadowMode} tenantName={shadowTenantName} />
        ) : null}

        <header className="flex items-center justify-between gap-3 bg-blue px-4 py-3 lg:hidden">
          <button
            aria-expanded={drawerOpen}
            aria-label="Open navigation"
            className="rounded-[10px] border border-blue-line px-3 py-2 text-white"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            <span aria-hidden>☰</span>
          </button>
          <SidebarBrand workspace={workspace} />
          <NotificationFlyout
            align="header"
            appearance="sidebar-dark"
            notifications={myNotifications}
          />
        </header>
        <MobileDrawer onClose={closeDrawer} open={drawerOpen}>
          {sidebar(closeDrawer)}
        </MobileDrawer>

        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[var(--rail-width)] overflow-y-auto bg-blue lg:block">
          {sidebar()}
        </aside>

        <div className="lg:pl-[var(--rail-width)]">
          <Suspense fallback={null}>
            <SectionTabs flags={flags} workspace={workspace} />
          </Suspense>
          <main
            className={cn(
              "px-0 py-0 pb-6 outline-none",
              contentWidth === "full"
                ? "w-full"
                : contentWidth === "wide"
                  ? "mx-auto w-full max-w-[1600px]"
                  : "mx-auto w-full max-w-7xl",
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

        <CommandPalette
          entries={entries}
          onClose={() => setPaletteOpen(false)}
          open={paletteOpen}
        />
      </div>
    </TenantBrandingProvider>
  );
}
