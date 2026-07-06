import Link from "next/link";
import { ReactNode, Suspense } from "react";
import { NavMobile, NavSidebar } from "@/components/nav-sidebar";
import { NavTopBar } from "@/components/nav-top-bar";
import { SailPointLogoMark } from "@/components/shell/sailpoint-logo-mark";
import { SidebarUserFooter } from "@/components/sidebar-user-footer";
import { MobilePracticeShell } from "@/components/practice/mobile-practice-shell";
import { UatBugTracker } from "@/components/uat/uat-bug-tracker";
import { NotificationFlyout } from "@/components/notifications/notification-flyout";
import { getAccessTier } from "@/lib/auth/rbac";
import { isNorthstarUiEnabled } from "@/lib/feature-flags";
import { isForgeConfigured } from "@/lib/forge/config";
import { Notification, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function SidebarLogo({ homeHref }: { homeHref: string }) {
  return (
    <div className="shrink-0 border-b border-white/[0.07] px-5 pb-4 pt-5">
      <Link className="flex items-center gap-2.5" href={homeHref}>
        <SailPointLogoMark />
        <span>
          <span className="block font-display text-[13px] font-extrabold leading-tight tracking-tight text-white">
            SailPoint
          </span>
          <span className="block text-[10px] font-medium tracking-wide text-white/45">SE Enablement</span>
        </span>
      </Link>
    </div>
  );
}

export function AppShell({
  children,
  currentUser,
  notifications,
  contentWidth = "default",
}: {
  children: ReactNode;
  currentUser: Profile;
  notifications: Notification[];
  contentWidth?: "default" | "wide" | "full";
}) {
  const tier = getAccessTier(currentUser.role);
  const myNotifications = notifications.filter((item) => item.userId === currentUser.id);
  const northstar = isNorthstarUiEnabled();
  const homeHref = tier === "manager" ? "/manager" : tier === "admin" ? "/admin" : "/dashboard";

  return (
    <div className={cn("min-h-screen bg-[#f4f8fd]", northstar && "design-northstar")}>
      {/* Mobile header */}
      <header className="border-b border-white/10 bg-[#00143a] px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link className="flex items-center gap-2.5" href={homeHref}>
            <SailPointLogoMark className="!h-8 !w-8" />
            <span className="font-display text-sm font-bold text-white">SE Enablement</span>
          </Link>
          <NotificationFlyout
            align="header"
            appearance="sidebar-dark"
            notifications={myNotifications}
          />
        </div>
        <NavMobile tier={tier} />
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] flex-col bg-[#00143a] lg:flex">
        <SidebarLogo homeHref={homeHref} />
        <div className="sp-sidebar-scroll min-h-0 flex-1 overflow-y-auto py-3">
          <Suspense fallback={<div className="px-5 py-2 text-xs text-white/40">Loading…</div>}>
            <NavSidebar notifications={myNotifications} tier={tier} />
          </Suspense>
        </div>
        <SidebarUserFooter currentUser={currentUser} notifications={notifications} />
      </aside>

      {/* Main column */}
      <div className="lg:pl-[220px]">
        <div className="hidden lg:block">
          <NavTopBar currentUser={currentUser} notifications={myNotifications} tier={tier} />
        </div>
        <main
          className={cn(
            "bg-[#f4f8fd]",
            northstar ? "px-0 py-0 pb-20 lg:pb-6" : "px-4 py-6 pb-20 lg:px-7 lg:py-6 lg:pb-6",
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
  );
}
