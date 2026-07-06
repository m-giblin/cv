"use client";

import { cn } from "@/lib/utils";
import { AdminSettingsAiSection } from "@/components/admin/admin-settings-ai-section";
import { AdminSettingsBasicSection } from "@/components/admin/admin-settings-basic-section";
import { AdminSettingsFeatureFlagsSection } from "@/components/admin/admin-settings-feature-flags-section";
import { AdminSettingsIntegrationsSection } from "@/components/admin/admin-settings-integrations-section";

export const ADMIN_SETTINGS_SECTIONS = [
  { id: "ai", label: "AI Provider" },
  { id: "flags", label: "Feature flags" },
  { id: "integrations", label: "Integrations" },
  { id: "basic", label: "Basic" },
] as const;

export type AdminSettingsSection = (typeof ADMIN_SETTINGS_SECTIONS)[number]["id"];

export function parseAdminSettingsSection(value: string | null): AdminSettingsSection {
  if (value && ADMIN_SETTINGS_SECTIONS.some((section) => section.id === value)) {
    return value as AdminSettingsSection;
  }
  return "ai";
}

export function AdminSettingsPanel({
  section,
  onSectionChange,
}: {
  section: AdminSettingsSection;
  onSectionChange: (section: AdminSettingsSection) => void;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <nav aria-label="Settings sections" className="flex shrink-0 flex-row gap-1 overflow-x-auto lg:w-[200px] lg:flex-col lg:gap-0.5">
        {ADMIN_SETTINGS_SECTIONS.map((item) => (
          <button
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-left text-[12px] font-semibold transition",
              section === item.id
                ? "bg-[#00143a] text-white"
                : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0a1628]",
            )}
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1">
        {section === "ai" ? <AdminSettingsAiSection /> : null}
        {section === "flags" ? <AdminSettingsFeatureFlagsSection /> : null}
        {section === "integrations" ? <AdminSettingsIntegrationsSection /> : null}
        {section === "basic" ? <AdminSettingsBasicSection /> : null}
      </div>
    </div>
  );
}
