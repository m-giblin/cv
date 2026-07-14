"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Toggle as AdminToggle } from "@/components/admin/admin-toggle";
import {
 PLATFORM_FEATURE_FLAG_DEFS,
 type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";
import { featureFlagsDiffFromDefaults } from "@/lib/platform/flag-presets";

export function AdminSettingsFeatureFlagsSection() {
 const [loading, setLoading] = useState(true);
 const [featureFlags, setFeatureFlags] = useState<PlatformFeatureFlags>({});

 const load = useCallback(async () => {
 setLoading(true);
 const response = await fetch("/api/admin/platform-settings");
 setLoading(false);
 if (!response.ok) {
 toast.error("Could not load feature flags.");
 return;
 }
 const body = (await response.json()) as { settings: { featureFlags: PlatformFeatureFlags } };
 setFeatureFlags(body.settings.featureFlags);
 }, []);

 useEffect(() => {
 void load();
 }, [load]);

 const diff = useMemo(() => featureFlagsDiffFromDefaults(featureFlags), [featureFlags]);

 if (loading) {
 return (
 <div className="flex justify-center py-8">
 <Loader2 className="h-6 w-6 animate-spin text-[#0033a1]" />
 </div>
 );
 }

 return (
 <div className="max-w-3xl space-y-4">
 <div className="border border-[#E2DFD9] bg-[#F9F8F6] px-4 py-3 text-[12px] text-[#3D3C38]">
 Feature entitlements are managed by the platform operator. Contact support to request changes.
 <Link className="ml-1 inline-flex items-center gap-1 font-semibold text-[#0033a1] hover:underline" href="/admin?tab=help">
 Open Help
 <ExternalLink className="h-3 w-3" />
 </Link>
 </div>

 {diff.length > 0 ? (
 <p className="text-[12px] text-[#6B6860]">
 {diff.length} entitlement{diff.length === 1 ? "" : "s"} differ from platform defaults for your organization.
 </p>
 ) : null}

 <div className="border border-[#E2DFD9] bg-white p-[18px_22px]">
 <div className="space-y-[12px]">
 {PLATFORM_FEATURE_FLAG_DEFS.map((flag) => (
 <div
 className="flex items-start justify-between gap-[12px] border-b border-[#ECEAE6] py-[10px] last:border-0"
 key={flag.id}
 >
 <div>
 <p className="mb-[2px] text-[12px] font-semibold text-[#3D3C38]">{flag.label}</p>
 <p className="text-[10.5px] leading-[1.5] text-[#A09D98]">{flag.description}</p>
 </div>
 <AdminToggle
 checked={featureFlags[flag.id] ?? flag.defaultEnabled}
 className="mt-[2px] shrink-0 opacity-70"
 disabled
 onChange={() => undefined}
 />
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
