"use client";

import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { ADMIN_SETTINGS_TABS } from "@/lib/admin/admin-routes";

/** Settings header (handoff 12b): "Settings." with the serif accent, a subtitle, then text tabs for the sections. */
export function AdminSettingsHeader({ active, subtitle }: { active: string; subtitle?: ReactNode }) {
  return (
    <>
      <PageHeader accent="Turn things on as you need them." eyebrow="Settings" subtitle={subtitle} title="Settings." />
      <div className="px-[var(--page-pad-x)] pb-[22px] max-sm:px-4">
        <Tabs
          items={ADMIN_SETTINGS_TABS.map((tab) => ({ id: tab.id, label: tab.label, href: tab.href }))}
          label="Settings sections"
          value={active}
        />
      </div>
    </>
  );
}
