"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { NotificationFlyout } from "@/components/notifications/notification-flyout";
import { UserAccountMenu } from "@/components/nav/user-account-menu";
import { RoleSwitcher, type DemoRole } from "@/components/practice/role-switcher";
import { useTenantBranding } from "@/components/tenant/tenant-branding-provider";
import type { AccessTier } from "@/lib/auth/rbac";
import { getPracticePageMeta } from "@/lib/navigation/practice-page-meta";
import { getPageTitleFromPath, getRolePillLabel } from "@/lib/navigation/page-title";
import type { Notification, Profile } from "@/lib/types";

export function NavTopBar({
  tier,
  currentUser,
  notifications,
}: {
  tier: AccessTier;
  currentUser: Profile;
  notifications: Notification[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const branding = useTenantBranding();
  const practiceMeta = getPracticePageMeta(pathname);
  const [demoRole, setDemoRole] = useState<DemoRole>("se");

  const pageTitle = getPageTitleFromPath(pathname, tier, {
    managerSection: searchParams.get("section"),
    adminTab: searchParams.get("tab"),
    fallbackTitle: branding.productName,
  });

  const searchPlaceholder =
    tier === "manager" || tier === "super_admin" ? "Search team..." : "search...";
  const showDemoRoleSwitcher = tier === "se" && practiceMeta !== null;

  return (
    <header className="sticky top-0 z-10 flex h-[44px] shrink-0 items-center justify-between border-b border-[#E2DFD9] bg-white px-5">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
        style={{ background: "linear-gradient(90deg,#0033a1,#0071ce,#cc27b0)" }}
      />
      <div className="flex min-w-0 items-center gap-0">
        {practiceMeta ? (
          <>
            <span className="font-mono text-[10.5px] text-[#A09D98]">{practiceMeta.section}</span>
            <span className="px-1 font-mono text-[10.5px] text-[#C4C1BB]">›</span>
            <span className="truncate font-mono text-[10.5px] font-medium text-[#3D3C38]">
              {practiceMeta.title}
            </span>
            <span className="ml-2.5 hidden border border-[#E2DFD9] bg-[#F5F4F0] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-[#B0ADA8] sm:inline">
              {practiceMeta.eyebrow}
            </span>
          </>
        ) : (
          <>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8]">
              {branding.productTagline}
            </span>
            <span className="mx-3 h-[14px] w-px bg-[#E2DFD9]" />
            <span className="truncate font-display text-[13px] font-extrabold tracking-[-0.01em] text-[#0D0E12]">
              {pageTitle}
            </span>
            <span className="sp-role-pill sp-role-pill-admin ml-2" style={{ color: branding.primaryColor }}>
              {getRolePillLabel(tier)}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showDemoRoleSwitcher ? <RoleSwitcher onChange={setDemoRole} value={demoRole} /> : null}
        <div
          className="hidden w-[160px] items-center gap-1.5 border border-[#E2DFD9] bg-[#F5F4F0] px-2.5 py-1 sm:flex"
          role="search"
        >
          <Search className="h-[11px] w-[11px] shrink-0 text-[#B0ADA8]" strokeWidth={1.3} />
          <span className="flex-1 font-mono text-[10px] text-[#B0ADA8]">{searchPlaceholder}</span>
        </div>
        <NotificationFlyout align="header" appearance="header" notifications={notifications} />
        <UserAccountMenu currentUser={currentUser} appearance="header" />
      </div>
    </header>
  );
}
