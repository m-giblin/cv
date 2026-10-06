"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import type { WorkspaceHat } from "@/lib/auth/workspace";
import { resolveActive, visibleNav } from "@/lib/navigation/nav-model";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";

/**
 * Text tabs for the active nav item's children (e.g. Readiness › Competencies / Feedback / …).
 * The sidebar already lists these as sub-items; render this only where a design shows page tabs.
 */
export function SectionTabs({
  workspace,
  flags,
  className,
}: {
  workspace: WorkspaceHat;
  flags?: PlatformFeatureFlags;
  className?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { itemId, childId } = resolveActive(workspace, pathname, params);
  const item = visibleNav(workspace, flags).find((entry) => entry.id === itemId);
  const children = item?.children;
  if (!item || !children || children.length < 2) return null;

  return (
    <Tabs
      className={className}
      items={children.map((child) => ({ id: child.id, label: child.label, href: child.href }))}
      label={`${item.label} sections`}
      value={childId ?? children[0]!.id}
    />
  );
}
