"use client";

import Link from "next/link";
import { UserCircle } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationFlyout } from "@/components/notifications/notification-flyout";
import { getTierLabel, getAccessTier } from "@/lib/auth/rbac";
import { Notification, Profile } from "@/lib/types";
import { initials } from "@/lib/utils";

export function SidebarUserFooter({
  currentUser,
  notifications,
}: {
  currentUser: Profile;
  notifications: Notification[];
}) {
  const tierLabel = getTierLabel(getAccessTier(currentUser.role));
  const myNotifications = notifications.filter((item) => item.userId === currentUser.id);

  return (
    <div className="shrink-0 border-t border-white/[0.07] px-4 pb-4 pt-3">
      <div className="flex items-center gap-2.5 rounded-[10px] bg-white/5 px-3 py-2.5">
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0057a8] to-[#cd27b0] text-xs font-bold text-white">
          {initials(currentUser.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white/90">{currentUser.fullName}</p>
          <p className="truncate text-[10px] text-white/40">{currentUser.email || tierLabel}</p>
        </div>
        <NotificationFlyout
          align="sidebar"
          appearance="sidebar-dark"
          notifications={myNotifications}
        />
      </div>
      <div className="mt-2 flex gap-1.5">
        <Link
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[7px] bg-white/5 px-1.5 py-1.5 text-[11px] font-medium text-white/50 transition hover:bg-white/[0.08] hover:text-white/75"
          href="/account"
        >
          <UserCircle className="h-3.5 w-3.5" />
          Account
        </Link>
        <SignOutButton darkSidebar />
      </div>
    </div>
  );
}
