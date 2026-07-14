"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { navRouteIcon } from "@/lib/navigation/nav-display";
import {
  ADMIN_PORTAL_NAV_GROUPS,
  isAdminPortalNavItemActive,
} from "@/lib/navigation/admin-portal-nav";
import {
  MANAGER_PORTAL_NAV_GROUPS,
  isManagerPortalNavItemActive,
} from "@/lib/navigation/manager-portal-nav";
import {
 getNavGroupsForTier,
 getNavItemsForTier,
 isNavItemActive,
 resolveNavHref,
 type AccessTier,
 usesManagerPortalNav,
} from "@/lib/auth/rbac";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import { mergeFeatureFlags } from "@/lib/platform/settings-shared";
import type { Notification } from "@/lib/types";
import { useTenantBranding } from "@/components/tenant/tenant-branding-provider";
import { cn } from "@/lib/utils";

function unreadCountForNavItem(notifications: Notification[], href: string) {
 return notifications.filter((item) => {
 if (item.readAt) return false;
 if (!item.actionUrl) return false;
 return item.actionUrl === href || item.actionUrl.startsWith(`${href}?`) || item.actionUrl.startsWith(`${href}#`);
 }).length;
}

function AdminPortalSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const settingsSection = searchParams.get("section");
  const query = searchParams.toString();

  return (
    <nav aria-label="Admin console" className="space-y-1">
      {ADMIN_PORTAL_NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.id}>
          {groupIndex > 0 ? <div className="mx-4 my-[10px] h-px bg-white/[0.05]" /> : null}
          <p className="sp-sidebar-group-label px-4 pb-1 pt-2">{group.label}</p>
          <div>
            {group.items.map((item) => {
              const active = isAdminPortalNavItemActive(item, pathname, tab, settingsSection, query);

              return (
                <Link
                  className={cn(
                    "sp-sidebar-nav-item",
                    active ? "sp-sidebar-nav-active" : "sp-sidebar-nav-inactive",
                  )}
                  href={item.href}
                  key={item.id}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ManagerPortalSidebar({ showPlatformLink = false }: { showPlatformLink?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav aria-label="Manager portal" className="space-y-1">
      {MANAGER_PORTAL_NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.id}>
          {groupIndex > 0 ? <div className="mx-4 my-[10px] h-px bg-white/[0.05]" /> : null}
          <p className="sp-sidebar-group-label px-4 pb-1 pt-2">{group.label}</p>
          <div>
            {group.items.map((item) => {
              const active = isManagerPortalNavItemActive(item, pathname, searchParams);

              return (
                <Link
                  className={cn(
                    "sp-sidebar-nav-item",
                    active ? "sp-sidebar-nav-active" : "sp-sidebar-nav-inactive",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {showPlatformLink ? (
        <div>
          <div className="mx-4 my-[10px] h-px bg-white/[0.05]" />
          <p className="sp-sidebar-group-label px-4 pb-1 pt-2">PLATFORM</p>
          <Link
            className={cn(
              "sp-sidebar-nav-item",
              pathname.startsWith("/platform") ? "sp-sidebar-nav-active" : "sp-sidebar-nav-inactive",
            )}
            href="/platform"
          >
            <span className="min-w-0 flex-1 truncate">Platform Console</span>
          </Link>
        </div>
      ) : null}
    </nav>
  );
}

export function NavSidebar({
 tier,
 notifications = [],
}: {
 tier: AccessTier;
 notifications?: Notification[];
}) {
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const [hash, setHash] = useState("");
 const [featureFlags, setFeatureFlags] = useState<PlatformFeatureFlags | undefined>(undefined);
 const managerSection = pathname === "/manager" ? searchParams.get("section") : null;

 useEffect(() => {
 if (tier === "super_admin" || tier === "admin") return;

 const cacheKey = "tenant-feature-flags";
 const cached = sessionStorage.getItem(cacheKey);
 if (cached) {
 try {
 const { flags, at } = JSON.parse(cached) as { flags: PlatformFeatureFlags; at: number };
 if (Date.now() - at < 2 * 60_000) {
 setFeatureFlags(mergeFeatureFlags(flags));
 }
 } catch {
 // ignore
 }
 }

 void fetch("/api/tenant/feature-flags")
 .then((response) => (response.ok ? response.json() : { featureFlags: {} }))
 .then((body: { featureFlags?: PlatformFeatureFlags }) => {
 const flags = mergeFeatureFlags(body.featureFlags);
 setFeatureFlags(flags);
 sessionStorage.setItem(cacheKey, JSON.stringify({ flags, at: Date.now() }));
 })
 .catch(() => setFeatureFlags(mergeFeatureFlags({})));
 }, [tier]);

 const navGroups = getNavGroupsForTier(tier, featureFlags);

 useEffect(() => {
 setHash(window.location.hash);
 const onHashChange = () => setHash(window.location.hash);
 window.addEventListener("hashchange", onHashChange);
 return () => window.removeEventListener("hashchange", onHashChange);
 }, [pathname]);

 const unreadByHref = useMemo(() => {
 const map = new Map<string, number>();
 for (const group of navGroups) {
 for (const item of group.items) {
 const href = resolveNavHref(item, tier);
 const count = unreadCountForNavItem(notifications, href);
 if (count > 0) map.set(href, count);
 }
 }
 return map;
 }, [navGroups, notifications, tier]);

  if (tier === "admin") {
    return <AdminPortalSidebar />;
  }

  if (usesManagerPortalNav(tier)) {
    return <ManagerPortalSidebar showPlatformLink={tier === "super_admin"} />;
  }

 return (
 <nav aria-label="Sidebar" className="space-y-5">
 {navGroups.map((group) => (
 <div className="mb-5" key={group.id}>
 <p className="sp-sidebar-group-label">{group.label}</p>
 <div>
 {group.items.map((item) => {
 const href = resolveNavHref(item, tier);
 const active = isNavItemActive(item, pathname, hash, tier, managerSection);
 const badge = unreadByHref.get(href);

 return (
 <Link
 className={cn(
 "sp-sidebar-nav-item",
 active ? "sp-sidebar-nav-active" : "sp-sidebar-nav-inactive",
 )}
 href={href}
 key={item.href}
 >
 <span aria-hidden className="w-[18px] shrink-0 text-center text-[15px] leading-none">
 {navRouteIcon(item.href)}
 </span>
 <span className="min-w-0 flex-1 truncate">{item.label}</span>
 {badge ? <span className="sp-sidebar-nav-badge">{badge > 9 ? "9+" : badge}</span> : null}
 </Link>
 );
 })}
 </div>
 </div>
 ))}
 </nav>
 );
}

export function NavMobile({ tier }: { tier: AccessTier }) {
 const pathname = usePathname();
 const branding = useTenantBranding();
  const navItems =
    tier === "admin"
      ? ADMIN_PORTAL_NAV_GROUPS.flatMap((g) => g.items)
      : usesManagerPortalNav(tier)
        ? [
            ...MANAGER_PORTAL_NAV_GROUPS.flatMap((g) => g.items),
            ...(tier === "super_admin" ? [{ href: "/platform", label: "Platform" }] : []),
          ]
        : getNavItemsForTier(tier);

 return (
 <nav aria-label="Mobile" className="mt-3 flex gap-2 overflow-x-auto pb-1">
 {navItems.map((item, index) => {
 const href = item.href;
 const itemKey = "id" in item && typeof (item as { id?: string }).id === "string"
 ? (item as { id: string }).id
 : `${href}-${index}`;
 const active = pathname === href.split("?")[0] || pathname.startsWith(`${href.split("?")[0]}/`);

 return (
 <Link
 className={cn(
 "whitespace-nowrap px-3 py-1.5 text-xs font-semibold transition",
 active ? "text-white " : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white",
 )}
 href={href}
 key={itemKey}
 style={active ? { backgroundColor: branding.primaryColor } : undefined}
 >
 {item.label}
 </Link>
 );
 })}
 </nav>
 );
}
