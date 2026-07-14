"use client";

import Link from "next/link";
import { CSSProperties, ReactNode, Suspense } from "react";
import { NavMobile, NavSidebar } from "@/components/nav-sidebar";
import { NavTopBar } from "@/components/nav-top-bar";
import { ShadowTenantBanner } from "@/components/platform/shadow-tenant-banner";
import { TenantBrandMark, TenantBrandText } from "@/components/tenant/tenant-brand-mark";
import { TenantBrandingProvider, useTenantBranding } from "@/components/tenant/tenant-branding-provider";
import { SidebarUserFooter } from "@/components/sidebar-user-footer";
import { MobilePracticeShell } from "@/components/practice/mobile-practice-shell";
import { UatBugTracker } from "@/components/uat/uat-bug-tracker";
import { NotificationFlyout } from "@/components/notifications/notification-flyout";
import { getHomeRoute, type AccessTier } from "@/lib/auth/rbac";
import { isForgeConfigured } from "@/lib/forge/config";
import type { TenantShellBranding } from "@/lib/tenant/shell-branding";
import { Notification, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function AdminTenantBadge() {
  const branding = useTenantBranding();
  const slug = branding.tenantSlug ? `${branding.tenantSlug}.sailpoint.io` : branding.productTagline;

  return (
    <div className="mt-2 flex items-center justify-between border border-white/[0.08] bg-white/[0.05] px-2.5 py-1.5">
      <div className="min-w-0">
        <div className="truncate text-[11px] font-medium text-white/75">{branding.productName}</div>
        <div className="truncate font-mono text-[8px] tracking-[0.06em] text-white/30">{slug}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-[#0A6E45]" />
        <span className="font-mono text-[8px] text-white/30">Active</span>
      </div>
    </div>
  );
}

function SidebarLogo({ homeHref, tier }: { homeHref: string; tier: AccessTier }) {
  return (
    <div className="shrink-0 border-b border-white/[0.07] px-4 pb-4 pt-5">
      <Link className="flex items-center gap-2.5" href={homeHref}>
        <TenantBrandMark />
        <TenantBrandText
          taglineClassName="font-mono text-[8px] tracking-[0.14em] text-white/30"
          titleClassName="font-display text-[14px] font-extrabold text-white"
        />
      </Link>
      {tier === "admin" ? <AdminTenantBadge /> : null}
    </div>
  );
}

export function AppShellView({
  children,
  currentUser,
  notifications,
  contentWidth = "default",
  tier,
  shadowTenantName,
  shadowMode,
  branding,
}: {
  children: ReactNode;
  currentUser: Profile;
  notifications: Notification[];
  contentWidth?: "default" | "wide" | "full";
  tier: AccessTier;
  shadowTenantName: string | null;
  shadowMode: "admin" | "se" | null;
  branding: TenantShellBranding;
}) {
  const myNotifications = notifications.filter((item) => item.userId === currentUser.id);
  const homeHref = getHomeRoute(tier);
  const shellStyle = {
    "--tenant-primary": branding.primaryColor,
  } as CSSProperties;

  return (
    <TenantBrandingProvider branding={branding}>
      <div className="design-northstar min-h-screen bg-[#F5F4F0]" style={shellStyle}>
        {shadowTenantName && shadowMode ? (
          <ShadowTenantBanner mode={shadowMode} tenantName={shadowTenantName} />
        ) : null}

        <header className="relative border-b border-white/10 bg-[#00143a] px-4 py-3 lg:hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
            style={{ background: "linear-gradient(90deg,#0033a1,#0071ce,#cc27b0)" }}
          />
          <div className="flex items-center justify-between gap-3">
            <Link className="flex items-center gap-2.5" href={homeHref}>
              <TenantBrandMark className="!h-8 !w-8" />
              <TenantBrandText layout="inline" titleClassName="font-display text-sm font-bold text-white" />
            </Link>
            <NotificationFlyout align="header" appearance="sidebar-dark" notifications={myNotifications} />
          </div>
          <NavMobile tier={tier} />
        </header>

        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] flex-col bg-[#00143a] lg:flex">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px]"
            style={{ background: "linear-gradient(90deg,#0033a1,#0071ce,#cc27b0)" }}
          />
          <SidebarLogo homeHref={homeHref} tier={tier} />
          <div className="sp-sidebar-scroll min-h-0 flex-1 overflow-y-auto py-3">
            <Suspense fallback={<div className="px-5 py-2 text-xs text-white/40">Loading…</div>}>
              <NavSidebar notifications={myNotifications} tier={tier} />
            </Suspense>
          </div>
          <SidebarUserFooter currentUser={currentUser} notifications={notifications} />
        </aside>

        <div className="lg:pl-[220px]">
          <div className="hidden lg:block">
            <NavTopBar currentUser={currentUser} notifications={myNotifications} tier={tier} />
          </div>
          <main
            className={cn(
              "bg-[#F5F4F0] px-0 py-0 pb-20 lg:pb-6",
              contentWidth === "full"
                ? "w-full"
                : contentWidth === "wide"
                  ? "mx-auto w-full max-w-[1600px]"
                  : "mx-auto w-full max-w-7xl",
            )}
          >
            {children}
          </main>
          <MobilePracticeShell />
          <UatBugTracker
            enabled={isForgeConfigured()}
            reporterEmail={currentUser.email}
            reporterName={currentUser.fullName}
          />
        </div>
      </div>
    </TenantBrandingProvider>
  );
}
