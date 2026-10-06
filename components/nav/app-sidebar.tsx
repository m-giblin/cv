"use client";

import Link from "next/link";
import { LinkPending } from "@/components/nav/link-pending";
import { usePathname, useSearchParams } from "next/navigation";
import type { WorkspaceHat } from "@/lib/auth/workspace";
import { canonicalAdminHref } from "@/lib/admin/admin-routes";
import { canonicalHref } from "@/lib/manager/manager-routes";
import { resolveActive, visibleNav } from "@/lib/navigation/nav-model";
import { canonicalPlatformHref } from "@/lib/platform/platform-routes";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

const GROUP_LABELS: Record<WorkspaceHat, string> = {
  se: "My work",
  manager: "Manager",
  tenant_admin: "Admin",
  platform: "Platform",
};

function unreadFor(notifications: Notification[], hrefs: string[]) {
  return notifications.filter(
    (item) =>
      !item.readAt &&
      item.actionUrl &&
      hrefs.some((href) => {
        const base = href.split("?")[0] ?? href;
        const target = canonicalPlatformHref(canonicalAdminHref(canonicalHref(item.actionUrl ?? "")));
        return target === href || target.split(/[?#]/)[0] === base;
      }),
  ).length;
}

export type SidebarPerson = { id: string; name: string; role: string; href?: string };

/** White sidebar: one group of nav items, sub-items under the active parent, optional counts. */
export function SidebarContent({
  workspace,
  notifications,
  flags,
  counts,
  people,
  onNavigate,
}: {
  workspace: WorkspaceHat;
  notifications: Notification[];
  flags?: PlatformFeatureFlags;
  /** Optional right-aligned counts by nav item id, e.g. { ramp: "5 of 10" }. */
  counts?: Record<string, string | number>;
  /** SE workspace "Team" group: manager and mentor. */
  people?: SidebarPerson[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { itemId, childId } = resolveActive(workspace, pathname, params);
  const items = visibleNav(workspace, flags);

  return (
    <div className="flex flex-col gap-[26px] py-6">
      <nav aria-label={`${GROUP_LABELS[workspace]} navigation`} className="flex flex-col gap-0.5">
        <span className="label-caps px-6 pb-2">{GROUP_LABELS[workspace]}</span>
        {items.map((item) => {
          const active = item.id === itemId;
          const inbox = item.id === "inbox" ? unreadFor(notifications, [item.href]) : 0;
          const count = counts?.[item.id];
          const children = active ? (item.children ?? []) : [];
          return (
            <div key={item.id}>
              <Link
                aria-current={active && !childId ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 px-6 py-2 text-[15px] no-underline",
                  active
                    ? "bg-blue-soft font-bold text-blue shadow-[inset_3px_0_0_var(--color-blue)]"
                    : "font-medium text-ink hover:bg-bg",
                )}
                href={item.href}
                onClick={onNavigate}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{item.label}</span>
                  <LinkPending />
                </span>
                {inbox > 0 ? (
                  <span className="num rounded-full bg-signal px-2.5 text-[13px] leading-[22px] font-bold text-ink">
                    {inbox > 99 ? "99+" : inbox}
                  </span>
                ) : count !== undefined ? (
                  <span className="num text-[13px] font-medium text-muted">{count}</span>
                ) : null}
              </Link>
              {children.length > 1 ? (
                <ul className="flex flex-col pb-1">
                  {children.map((child) => {
                    const childActive = child.id === childId;
                    return (
                      <li key={child.id}>
                        <Link
                          aria-current={childActive ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2 py-1.5 pr-6 pl-10 text-sm no-underline",
                            childActive ? "font-bold text-blue" : "font-medium text-ink-2 hover:text-ink",
                          )}
                          href={child.href}
                          onClick={onNavigate}
                        >
                          {child.label}
                          <LinkPending />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>
      {people && people.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          <span className="label-caps px-6 pb-2">Team</span>
          {people.map((person) =>
            person.href ? (
              <Link
                className="truncate px-6 py-2 text-[15px] font-medium text-ink no-underline hover:bg-bg"
                href={person.href}
                key={person.id}
                onClick={onNavigate}
              >
                {person.name}, {person.role}
              </Link>
            ) : (
              <span className="truncate px-6 py-2 text-[15px] font-medium text-ink" key={person.id}>
                {person.name}, {person.role}
              </span>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
