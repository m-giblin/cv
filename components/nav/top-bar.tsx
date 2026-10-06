"use client";

import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { NotificationFlyout } from "@/components/notifications/notification-flyout";
import { UserAccountMenu } from "@/components/nav/user-account-menu";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { getWorkspaceHome, type WorkspaceHat } from "@/lib/auth/workspace";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/tenant/shell-branding-shared";
import type { Notification, Profile } from "@/lib/types";

export function LogoMark() {
  return (
    <span aria-hidden className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[7px] bg-signal">
      <span className="h-3 w-3 rotate-45 rounded-[2px] border-[2.5px] border-ink" />
    </span>
  );
}

export function Wordmark({ workspace }: { workspace: WorkspaceHat }) {
  return (
    <Link className="flex items-center gap-3 no-underline" href={getWorkspaceHome(workspace)}>
      <LogoMark />
      <span className="flex flex-col">
        <span className="wordmark">{PRODUCT_NAME}</span>
        <span className="wordmark__sub hidden sm:block">{PRODUCT_TAGLINE}</span>
      </span>
    </Link>
  );
}

/** 60px blue bar: wordmark, search (opens ⌘K), workspace switcher, notifications, avatar. */
export function TopBar({
  workspace,
  workspaceHats,
  currentUser,
  notifications,
  onOpenPalette,
  onOpenMenu,
  menuOpen,
}: {
  workspace: WorkspaceHat;
  workspaceHats: WorkspaceHat[];
  currentUser: Profile;
  notifications: Notification[];
  onOpenPalette: () => void;
  onOpenMenu: () => void;
  menuOpen: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center gap-4 bg-blue px-4 sm:gap-6 sm:px-6">
      <button
        aria-expanded={menuOpen}
        aria-label="Open navigation"
        className="grid h-9 w-9 place-items-center rounded-[10px] text-white hover:bg-blue-2 lg:hidden"
        onClick={onOpenMenu}
        type="button"
      >
        <Menu aria-hidden className="h-5 w-5" />
      </button>
      <Wordmark workspace={workspace} />
      <div className="flex flex-1 justify-center">
        <button
          className="hidden w-[420px] max-w-full items-center justify-between rounded-full border border-blue-line bg-blue-2 px-4 py-2 text-left text-sm text-on-blue hover:border-on-blue md:flex"
          onClick={onOpenPalette}
          type="button"
        >
          <span className="truncate">Search lessons, practice, people</span>
          <kbd className="rounded-[5px] border border-blue-line px-1.5 text-xs">/</kbd>
        </button>
      </div>
      <div className="flex items-center gap-3 sm:gap-[18px]">
        <button
          aria-label="Search"
          className="grid h-9 w-9 place-items-center rounded-[10px] text-on-blue hover:bg-blue-2 md:hidden"
          onClick={onOpenPalette}
          type="button"
        >
          <Search aria-hidden className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <WorkspaceSwitcher activeHat={workspace} hats={workspaceHats} />
        </div>
        <NotificationFlyout align="header" appearance="sidebar-dark" notifications={notifications} />
        <UserAccountMenu appearance="topbar" currentUser={currentUser} />
      </div>
    </header>
  );
}
