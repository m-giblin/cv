"use client";

import { AlertCircle, Loader2, Save } from "lucide-react";
import { useMemo } from "react";
import { Toggle as AdminToggle } from "@/components/admin/admin-toggle";
import { Button } from "@/components/ui/button";
import { FEATURE_FLAG_CATEGORY_LABELS } from "@/lib/platform/feature-flags";
import {
 applyFeatureFlagPreset,
 FEATURE_FLAG_PRESETS,
 featureFlagsDiffFromDefaults,
 type FeatureFlagPresetId,
} from "@/lib/platform/flag-presets";
import {
 featureFlagsByCategory,
 mergeFeatureFlags,
 type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

export function PlatformTenantEntitlements({
 featureFlags,
 savedFlags,
 saving,
 onChange,
 onSave,
}: {
 featureFlags: PlatformFeatureFlags;
 savedFlags: PlatformFeatureFlags;
 saving: boolean;
 onChange: (flags: PlatformFeatureFlags) => void;
 onSave: () => void;
}) {
 const flagsByCategory = featureFlagsByCategory();
 const diff = useMemo(() => featureFlagsDiffFromDefaults(featureFlags), [featureFlags]);
 const hasUnsavedChanges = useMemo(
 () => JSON.stringify(featureFlags) !== JSON.stringify(savedFlags),
 [featureFlags, savedFlags],
 );

 function applyPreset(presetId: FeatureFlagPresetId) {
 onChange(applyFeatureFlagPreset(presetId));
 }

 return (
 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
 <div>
 <h3 className="text-base font-bold text-[#0D0E12]">Feature entitlements</h3>
 <p className="text-sm text-[#6B6860]">Apply presets or toggle modules for this tenant.</p>
 </div>
 <Button disabled={saving || !hasUnsavedChanges} onClick={onSave} type="button">
 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
 Save flags
 </Button>
 </div>

 {hasUnsavedChanges ? (
 <div className="mb-4 flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
 <AlertCircle className="h-4 w-4 shrink-0" />
 Unsaved changes — save before leaving this tab.
 </div>
 ) : null}

 <div className="mb-5">
 <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6B6860]">Presets</p>
 <div className="flex flex-wrap gap-2">
 {FEATURE_FLAG_PRESETS.map((preset) => (
 <button
 className="border border-[#E2DFD9] bg-[#F9F8F6] px-3 py-2 text-left text-sm transition hover:border-[#0071ce]"
 key={preset.id}
 onClick={() => applyPreset(preset.id)}
 type="button"
 >
 <p className="font-semibold text-[#0D0E12]">{preset.label}</p>
 <p className="text-xs text-[#A09D98]">{preset.description}</p>
 </button>
 ))}
 </div>
 </div>

 {diff.length > 0 ? (
 <div className="mb-5 border border-[#E2DFD9] bg-[#F9F8F6] p-3">
 <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6B6860]">Diff from defaults</p>
 <ul className="space-y-1 text-sm">
 {diff.map((item) => (
 <li className="text-[#3D3C38]" key={item.id}>
 <span className="font-medium text-[#0D0E12]">{item.label}</span> — default{" "}
 {item.defaultEnabled ? "on" : "off"}, effective {item.effective ? "on" : "off"}
 </li>
 ))}
 </ul>
 </div>
 ) : (
 <p className="mb-5 text-sm text-[#6B6860]">All flags match platform defaults.</p>
 )}

 <div className="space-y-6">
 {Object.entries(flagsByCategory).map(([category, flags]) => (
 <div key={category}>
 <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6B6860]">
 {FEATURE_FLAG_CATEGORY_LABELS[category] ?? category}
 </p>
 <div className="space-y-2">
 {flags.map((flag) => (
 <div
 className="flex items-start justify-between gap-3 border border-[#ECEAE6] px-3 py-2.5"
 key={flag.id}
 >
 <div>
 <p className="text-sm font-semibold text-[#0D0E12]">{flag.label}</p>
 <p className="text-xs text-[#A09D98]">{flag.description}</p>
 </div>
 <AdminToggle
 checked={featureFlags[flag.id] ?? flag.defaultEnabled}
 className="shrink-0"
 onChange={(enabled) =>
 onChange(mergeFeatureFlags({ ...featureFlags, [flag.id]: enabled }))
 }
 />
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}
