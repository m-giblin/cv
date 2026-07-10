"use client";

import { NotificationFlyout } from "@/components/notifications/notification-flyout";
import { UserAccountMenu } from "@/components/nav/user-account-menu";
import type { Notification, Profile } from "@/lib/types";

export function SidebarUserFooter({
 currentUser,
 notifications,
}: {
 currentUser: Profile;
 notifications: Notification[];
}) {
 const myNotifications = notifications.filter((item) => item.userId === currentUser.id);

 return (
 <div className="shrink-0 border-t border-white/[0.07] px-4 pb-4 pt-3">
 <div className="flex items-center gap-2.5 bg-white/5 px-3 py-2.5">
 <UserAccountMenu appearance="sidebar-dark" currentUser={currentUser} />
 <NotificationFlyout
 align="sidebar"
 appearance="sidebar-dark"
 notifications={myNotifications}
 />
 </div>
 </div>
 );
}
