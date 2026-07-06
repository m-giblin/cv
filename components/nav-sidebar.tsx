"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { navRouteIcon } from "@/lib/navigation/nav-display";
import {
  getNavGroupsForTier,
  getNavItemsForTier,
  isNavItemActive,
  resolveNavHref,
  type AccessTier,
} from "@/lib/auth/rbac";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

function unreadCountForNavItem(notifications: Notification[], href: string) {
  return notifications.filter((item) => {
    if (item.readAt) return false;
    if (!item.actionUrl) return false;
    return item.actionUrl === href || item.actionUrl.startsWith(`${href}?`) || item.actionUrl.startsWith(`${href}#`);
  }).length;
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
  const managerSection = pathname === "/manager" ? searchParams.get("section") : null;
  const navGroups = getNavGroupsForTier(tier);

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
  const navItems = getNavItemsForTier(tier);

  return (
    <nav aria-label="Mobile" className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-[#0071ce] text-white shadow-sm"
                : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
