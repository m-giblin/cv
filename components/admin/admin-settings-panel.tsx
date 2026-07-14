"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const AdminSettingsFeatureFlagsSection = dynamic(() =>
 import("@/components/admin/admin-settings-feature-flags-section").then((mod) => mod.AdminSettingsFeatureFlagsSection),
);
const AdminSettingsIntegrationsSection = dynamic(() =>
 import("@/components/admin/admin-settings-integrations-section").then((mod) => mod.AdminSettingsIntegrationsSection),
);
const AdminSettingsBasicSection = dynamic(() =>
 import("@/components/admin/admin-settings-basic-section").then((mod) => mod.AdminSettingsBasicSection),
);
const AdminSettingsRetentionSection = dynamic(() =>
 import("@/components/admin/admin-settings-retention-section").then((mod) => mod.AdminSettingsRetentionSection),
);

const AdminSettingsAiSection = dynamic(() =>
 import("@/components/admin/admin-settings-ai-section").then((mod) => mod.AdminSettingsAiSection),
);

export const ADMIN_SETTINGS_SECTIONS = [
 { id: "flags", label: "Feature flags" },
 { id: "integrations", label: "Integrations" },
 { id: "ai", label: "AI config" },
 { id: "basic", label: "Basic" },
 { id: "retention", label: "Data retention" },
] as const;

export type AdminSettingsSection = (typeof ADMIN_SETTINGS_SECTIONS)[number]["id"];

export function parseAdminSettingsSection(value: string | null): AdminSettingsSection {
 if (value && ADMIN_SETTINGS_SECTIONS.some((section) => section.id === value)) {
 return value as AdminSettingsSection;
 }
 return "flags";
}

export function AdminSettingsPanel({
 section,
 onSectionChange,
}: {
 section: AdminSettingsSection;
 onSectionChange: (section: AdminSettingsSection) => void;
}) {
 return (
 <div className="anim-in flex flex-col gap-6 lg:flex-row lg:items-start">
 <nav aria-label="Settings sections" className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b border-[#E2DFD9] lg:w-[200px] lg:flex-col lg:border-b-0 lg:gap-0.5">
 {ADMIN_SETTINGS_SECTIONS.map((item) => (
 <button
 className={cn(
 "whitespace-nowrap border border-b-0 px-3 py-2 text-left text-[12px] font-semibold transition lg:border-0 lg:px-3 lg:py-2",
 section === item.id
 ? "bg-white text-[#0D0E12] lg:bg-[rgba(204,39,176,0.12)] lg:text-[#cc27b0]"
 : "bg-[#F9F8F6] text-[#6B6860] hover:bg-[#ECEAE6] hover:text-[#0D0E12]",
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
 {section === "flags" ? <AdminSettingsFeatureFlagsSection /> : null}
 {section === "integrations" ? <AdminSettingsIntegrationsSection /> : null}
 {section === "ai" ? <AdminSettingsAiSection /> : null}
 {section === "basic" ? <AdminSettingsBasicSection /> : null}
 {section === "retention" ? <AdminSettingsRetentionSection /> : null}
 </div>
 </div>
 );
}
