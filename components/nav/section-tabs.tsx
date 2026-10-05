"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { WorkspaceHat } from "@/lib/auth/workspace";
import { resolveActive, visibleNav } from "@/lib/navigation/nav-model";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import { cn } from "@/lib/utils";

/** In-page tabs for the active sidebar item's children, so the sidebar stays at five entries. */
export function SectionTabs({
  workspace,
  flags,
}: {
  workspace: WorkspaceHat;
  flags?: PlatformFeatureFlags;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { itemId, childId } = resolveActive(workspace, pathname, params);
  const item = visibleNav(workspace, flags).find((entry) => entry.id === itemId);
  const children = item?.children;

  if (!item || !children || children.length < 2) return null;

  return (
    <nav
      aria-label={`${item.label} sections`}
      className="flex flex-wrap gap-2 border-b border-line bg-white px-[var(--gutter)] py-3"
    >
      {children.map((child) => {
        const active = child.id === childId;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-[7px] font-mono text-xs font-medium uppercase tracking-[0.03em] no-underline",
              active
                ? "bg-blue text-white"
                : "border-[1.5px] border-line-strong text-ink-2 hover:bg-blue-soft",
            )}
            href={child.href}
            key={child.id}
          >
            {child.label}
          </Link>
        );
      })}
    </nav>
  );
}
