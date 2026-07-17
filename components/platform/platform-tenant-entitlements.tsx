"use client";

import { AlertCircle, Loader2, Package, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Toggle as AdminToggle } from "@/components/admin/admin-toggle";
import { Button } from "@/components/ui/button";
import { FEATURE_FLAG_CATEGORY_LABELS, previewEntitledSurfaces } from "@/lib/platform/feature-flags";
import {
  applyFeatureFlagPreset,
  FEATURE_FLAG_PRESETS,
  featureFlagsDiffFromDefaults,
  matchFeatureFlagPreset,
  type FeatureFlagPresetId,
} from "@/lib/platform/flag-presets";
import {
  applyFlagToggle,
  featureFlagsByCategory,
  isFlagEffectivelyEnabled,
  mergeFeatureFlags,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

type EntitlementsPanel = "package" | "modules" | "preview" | "diff";

export function PlatformTenantEntitlements({
  featureFlags,
  savedFlags,
  saving,
  billingPlan,
  onChange,
  onSave,
  onApplyPackage,
}: {
  featureFlags: PlatformFeatureFlags;
  savedFlags: PlatformFeatureFlags;
  saving: boolean;
  billingPlan?: string | null;
  onChange: (flags: PlatformFeatureFlags) => void;
  onSave: () => void;
  onApplyPackage: (presetId: FeatureFlagPresetId, flags: PlatformFeatureFlags) => void;
}) {
  const [panel, setPanel] = useState<EntitlementsPanel>("package");
  const flagsByCategory = featureFlagsByCategory();
  const matchedPackage = useMemo(() => matchFeatureFlagPreset(featureFlags), [featureFlags]);
  const diff = useMemo(() => featureFlagsDiffFromDefaults(featureFlags), [featureFlags]);
  const preview = useMemo(() => previewEntitledSurfaces(featureFlags), [featureFlags]);
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(featureFlags) !== JSON.stringify(savedFlags),
    [featureFlags, savedFlags],
  );

  const enabledCount = useMemo(
    () => Object.values(mergeFeatureFlags(featureFlags)).filter(Boolean).length,
    [featureFlags],
  );

  return (
    <div className="border border-[#E2DFD9] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#0D0E12]">Entitlements</h3>
          <p className="text-xs text-[#6B6860]">
            Package → modules → preview. Commercial plan syncs when you apply a package.
          </p>
          <p className="mt-1 text-[11px] text-[#A09D98]">
            Package:{" "}
            <span className="font-semibold text-[#3D3C38]">
              {matchedPackage === "custom" ? "Custom" : FEATURE_FLAG_PRESETS.find((p) => p.id === matchedPackage)?.label}
            </span>
            {billingPlan ? (
              <>
                {" "}
                · Plan slug: <span className="font-mono text-[#3D3C38]">{billingPlan}</span>
              </>
            ) : null}
            {" · "}
            {enabledCount} modules on
          </p>
        </div>
        <Button disabled={saving || !hasUnsavedChanges} onClick={onSave} size="sm" type="button">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save entitlements
        </Button>
      </div>

      {hasUnsavedChanges ? (
        <div className="mb-3 flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Unsaved changes — save before leaving this tab.
        </div>
      ) : null}

      <div className="mb-4 flex gap-1 border-b border-[#E2DFD9]">
        {(
          [
            ["package", "Package"],
            ["modules", "Modules"],
            ["preview", "Preview"],
            ["diff", "Diff"],
          ] as const
        ).map(([id, label]) => (
          <button
            className={`border-b-2 px-3 py-1.5 text-xs font-medium ${
              panel === id
                ? "border-[#0071ce] text-[#0033a1]"
                : "border-transparent text-[#6B6860] hover:text-[#3D3C38]"
            }`}
            key={id}
            onClick={() => setPanel(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {panel === "package" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {FEATURE_FLAG_PRESETS.map((preset) => {
            const active = matchedPackage === preset.id;
            return (
              <button
                className={`border px-3 py-3 text-left transition ${
                  active
                    ? "border-[#0071ce] bg-[#F0F7FF]"
                    : "border-[#E2DFD9] bg-[#F9F8F6] hover:border-[#0071ce]"
                }`}
                key={preset.id}
                onClick={() => onApplyPackage(preset.id, applyFeatureFlagPreset(preset.id))}
                type="button"
              >
                <div className="mb-1 flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-[#0071ce]" />
                  <p className="text-sm font-semibold text-[#0D0E12]">{preset.label}</p>
                  {active ? (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-[#0071ce]">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-[#6B6860]">{preset.description}</p>
                <p className="mt-2 font-mono text-[10px] text-[#A09D98]">plan → {preset.billingPlan}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      {panel === "modules" ? (
        <div className="space-y-5">
          {Object.entries(flagsByCategory).map(([category, flags]) => (
            <div key={category}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#6B6860]">
                {FEATURE_FLAG_CATEGORY_LABELS[category] ?? category}
              </p>
              <div className="space-y-1.5">
                {flags.map((flag) => {
                  const storedOn = featureFlags[flag.id] ?? flag.defaultEnabled;
                  const effective = isFlagEffectivelyEnabled(featureFlags, flag.id);
                  const parentBlocked = storedOn && !effective;
                  return (
                    <div
                      className="flex items-start justify-between gap-3 border border-[#ECEAE6] px-3 py-2"
                      key={flag.id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#0D0E12]">{flag.label}</p>
                          {flag.kind === "ops" ? (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-[#A09D98]">
                              Ops
                            </span>
                          ) : null}
                          {parentBlocked ? (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700">
                              Needs parent
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[#A09D98]">{flag.description}</p>
                        {flag.dependsOn?.length ? (
                          <p className="mt-0.5 text-[10px] text-[#C9C7C2]">
                            Requires: {flag.dependsOn.join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <AdminToggle
                        checked={storedOn}
                        className="shrink-0"
                        onChange={(enabled) => onChange(applyFlagToggle(featureFlags, flag.id, enabled))}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {panel === "preview" ? (
        <div>
          <p className="mb-2 text-xs text-[#6B6860]">
            Surfaces a user would see with these entitlements (nav / middleware).
          </p>
          <ul className="divide-y divide-[#ECEAE6] border border-[#E2DFD9]">
            {preview.map((surface) => (
              <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm" key={surface.id}>
                <div>
                  <p className="font-medium text-[#0D0E12]">{surface.label}</p>
                  <p className="font-mono text-[10px] text-[#A09D98]">{surface.href}</p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide ${
                    surface.allowed ? "text-emerald-700" : "text-[#A09D98]"
                  }`}
                >
                  {surface.allowed ? "Allowed" : "Blocked"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {panel === "diff" ? (
        <div>
          {diff.length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {diff.map((item) => (
                <li className="border border-[#ECEAE6] px-3 py-2 text-[#3D3C38]" key={item.id}>
                  <span className="font-medium text-[#0D0E12]">{item.label}</span>
                  <span className="text-[#A09D98]"> — default {item.defaultEnabled ? "on" : "off"}</span>
                  <span className="text-[#A09D98]"> · effective </span>
                  <span className={item.effective ? "text-emerald-700" : "text-amber-800"}>
                    {item.effective ? "on" : "off"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#6B6860]">All modules match platform defaults (Full package).</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
