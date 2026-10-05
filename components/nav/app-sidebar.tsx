"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NotificationFlyout } from "@/components/notifications/notification-flyout";
import { UserAccountMenu } from "@/components/nav/user-account-menu";
import { useTenantBranding } from "@/components/tenant/tenant-branding-provider";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import {
  WORKSPACE_HAT_LABELS,
  getWorkspaceHome,
  type WorkspaceHat,
} from "@/lib/auth/workspace";
import { canonicalAdminHref } from "@/lib/admin/admin-routes";
import { canonicalHref } from "@/lib/manager/manager-routes";
import { canonicalPlatformHref } from "@/lib/platform/platform-routes";
import { resolveActive, visibleNav } from "@/lib/navigation/nav-model";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import type { Notification, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<WorkspaceHat, string> = {
  se: "Basic SE",
  manager: "Manager",
  tenant_admin: "Tenant admin",
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

export function SidebarBrand({ workspace }: { workspace: WorkspaceHat }) {
  const branding = useTenantBranding();
  return (
    <Link
      className="flex items-center gap-2.5 text-white no-underline"
      href={getWorkspaceHome(workspace)}
    >
      {branding.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="h-[26px] w-[26px] rounded-[8px] object-contain" src={branding.logoUrl} />
      ) : (
        <span
          aria-hidden
          className="grid h-[26px] w-[26px] place-items-center rounded-[8px] bg-signal font-mono text-xs font-medium text-ink"
        >
          SE
        </span>
      )}
      <span className="truncate text-base font-bold">{branding.productName}</span>
    </Link>
  );
}

export function SidebarContent({
  workspace,
  workspaceHats,
  currentUser,
  notifications,
  flags,
  onNavigate,
  onOpenPalette,
}: {
  workspace: WorkspaceHat;
  workspaceHats: WorkspaceHat[];
  currentUser: Profile;
  notifications: Notification[];
  flags?: PlatformFeatureFlags;
  onNavigate?: () => void;
  onOpenPalette: () => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { itemId } = resolveActive(workspace, pathname, params);
  const items = visibleNav(workspace, flags);
  const mine = notifications.filter((item) => item.userId === currentUser.id);

  return (
    <div className="flex h-full flex-col gap-4 px-3.5 py-5">
      <SidebarBrand workspace={workspace} />
      <WorkspaceSwitcher activeHat={workspace} hats={workspaceHats} />
      <button
        className="flex items-center justify-between rounded-[10px] bg-blue-2 px-2.5 py-2 text-left text-[13px] text-on-blue-muted hover:bg-blue-line"
        onClick={onOpenPalette}
        type="button"
      >
        <span>Search</span>
        <kbd className="font-mono text-xs">⌘K</kbd>
      </button>
      <nav aria-label={`${WORKSPACE_HAT_LABELS[workspace]} navigation`} className="flex flex-col gap-1">
        {items.map((item) => {
          const active = item.id === itemId;
          const unread = unreadFor(mine, [item.href, ...(item.children ?? []).map((c) => c.href)]);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-2 rounded-[10px] px-3 py-[9px] text-[15px] no-underline",
                active
                  ? "bg-signal font-bold text-ink"
                  : "font-medium text-[#EAF0FC] hover:bg-blue-2",
              )}
              href={item.href}
              key={item.id}
              onClick={onNavigate}
            >
              <span className="truncate">{item.label}</span>
              {unread > 0 ? (
                <span className="rounded-full bg-signal px-2 font-mono text-xs leading-[18px] text-ink">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-2.5 border-t border-blue-line pt-3">
        <UserAccountMenu appearance="sidebar-dark" currentUser={currentUser} />
        <NotificationFlyout align="sidebar" appearance="sidebar-dark" notifications={mine} />
        <span className="ml-auto font-mono text-xs uppercase text-on-blue-muted">
          {ROLE_LABELS[workspace]}
        </span>
      </div>
    </div>
  );
}
