"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { NotificationFlyout } from "@/components/notifications/notification-flyout";
import { UserAccountMenu } from "@/components/nav/user-account-menu";
import { SailPointLogoMark } from "@/components/shell/sailpoint-logo-mark";
import type { AccessTier } from "@/lib/auth/rbac";
import { getPageTitleFromPath, getRolePillClass, getRolePillLabel } from "@/lib/navigation/page-title";
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
  const pageTitle = getPageTitleFromPath(pathname, tier);
  const searchPlaceholder = tier === "manager" ? "Search team..." : "Search...";

  return (
    <header className="sticky top-0 z-10 flex h-[52px] shrink-0 items-center justify-between border-b border-[#e8edf4] bg-white px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-[7px]">
          <SailPointLogoMark variant="flat" />
          <span className="font-display text-[13px] font-extrabold tracking-[-0.01em] text-[#00143a]">
            SailPoint
          </span>
        </div>
        <span className="h-[18px] w-px bg-[#e2eaf5]" />
        <span className="truncate font-display text-[13.5px] font-bold text-[#0a1628]">{pageTitle}</span>
        <span className={getRolePillClass(tier)}>{getRolePillLabel(tier)}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <div
          className="hidden w-[196px] items-center gap-[7px] rounded-[7px] border border-[#e2eaf5] bg-[#f4f8fd] px-2.5 py-[5px] sm:flex"
          role="search"
        >
          <Search className="h-[13px] w-[13px] shrink-0 text-[#94a3b8]" strokeWidth={1.3} />
          <span className="flex-1 text-[11.5px] text-[#94a3b8]">{searchPlaceholder}</span>
          <kbd className="rounded-[3px] bg-[#e8edf4] px-[5px] py-px text-[9px] text-[#cbd5e1]">⌘K</kbd>
        </div>

        <NotificationFlyout align="header" appearance="header" notifications={notifications} />

        <UserAccountMenu currentUser={currentUser} appearance="header" />
      </div>
    </header>
  );
}
