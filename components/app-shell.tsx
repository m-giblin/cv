import Link from "next/link";
import { ReactNode } from "react";
import { NavMobile, NavSidebar } from "@/components/nav-sidebar";
import { SidebarUserFooter } from "@/components/sidebar-user-footer";
import { NotificationFlyout } from "@/components/notifications/notification-flyout";
import { Badge } from "@/components/ui/badge";
import { getAccessTier } from "@/lib/auth/rbac";
import { Notification, Profile } from "@/lib/types";

export function AppShell({
  children,
  currentUser,
  notifications,
}: {
  children: ReactNode;
  currentUser: Profile;
  notifications: Notification[];
}) {
  const unread = notifications.filter((notification) => !notification.readAt).length;
  const tier = getAccessTier(currentUser.role);
  const myNotifications = notifications.filter((item) => item.userId === currentUser.id);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-sp-blue/10 bg-white/80 p-6 backdrop-blur-xl lg:flex">
        <Link className="shrink-0 flex items-center gap-3" href={tier === "manager" ? "/manager" : "/dashboard"}>
          <span className="sp-logo-mark flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold text-white">
            SE
          </span>
          <span>
            <span className="block text-sm font-bold text-sp-navy">SE Enablement</span>
            <span className="block text-xs font-medium text-sp-navy-muted">SailPoint internal</span>
          </span>
        </Link>

        <div className="mt-8 min-h-0 flex-1 overflow-y-auto">
          <NavSidebar tier={tier} />
        </div>

        <SidebarUserFooter currentUser={currentUser} notifications={notifications} />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-sp-blue/10 bg-white/85 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link className="font-bold text-sp-navy" href={tier === "manager" ? "/manager" : "/dashboard"}>
              SE Enablement
            </Link>
            <div className="flex items-center gap-2">
              <NotificationFlyout align="header" notifications={myNotifications} />
              {unread > 0 ? <Badge tone="magenta">{unread}</Badge> : null}
            </div>
          </div>
          <NavMobile tier={tier} />
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
