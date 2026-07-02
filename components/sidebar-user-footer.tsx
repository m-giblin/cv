"use client";

import Link from "next/link";
import { UserCircle } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationFlyout } from "@/components/notifications/notification-flyout";
import { Notification, Profile } from "@/lib/types";
import { initials } from "@/lib/utils";
import { getTierLabel, getAccessTier } from "@/lib/auth/rbac";

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
    <div className="shrink-0 border-t border-sp-blue/10 pt-4">
      <div className="flex items-center gap-2 rounded-xl border border-sp-blue/10 bg-gradient-to-br from-white to-sp-blue-soft/20 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sp-blue to-sp-magenta text-xs font-bold text-white">
          {initials(currentUser.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-sp-navy">{currentUser.fullName}</p>
          <p className="truncate text-xs text-sp-navy-muted">{tierLabel}</p>
        </div>
        <NotificationFlyout align="sidebar" notifications={myNotifications} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Link
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-sp-navy-muted transition hover:bg-sp-blue-soft/30 hover:text-sp-navy"
          href="/account"
        >
          <UserCircle className="h-4 w-4" />
          Account
        </Link>
        <SignOutButton compact />
      </div>
    </div>
  );
}
