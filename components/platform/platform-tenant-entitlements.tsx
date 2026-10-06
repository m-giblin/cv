"use client";

import { useMemo, useState } from "react";
import { PlatformUnsavedBanner } from "@/components/platform/platform-unsaved-banner";
import {
  ChangedMark,
  EmptyLine,
  TABLE,
  TABLE_SCROLL,
  TABLE_WRAP,
  TD,
  TD_META,
  TD_MUTED,
  TH,
  THEAD_ROW,
  TR,
} from "@/components/platform/platform-ui";
import { Toggle } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { StatusPill } from "@/components/ui/status-pill";
import { FilterBar, rowHighlight } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
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
  PLATFORM_FEATURE_FLAG_DEFS,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";
import { cn } from "@/lib/utils";

type EntitlementsPanel = "package" | "modules" | "preview" | "diff";

const FLAG_LABELS = new Map(PLATFORM_FEATURE_FLAG_DEFS.map((def) => [def.id, def.label]));

export function PlatformTenantEntitlements({
  featureFlags,
  savedFlags,
  saving,
  billingPlan,
  onChange,
  onSave,
  onDiscard,
  onApplyPackage,
}: {
  featureFlags: PlatformFeatureFlags;
  savedFlags: PlatformFeatureFlags;
  saving: boolean;
  billingPlan?: string | null;
  onChange: (flags: PlatformFeatureFlags) => void;
  onSave: () => void;
  onDiscard: () => void;
  onApplyPackage: (presetId: FeatureFlagPresetId, flags: PlatformFeatureFlags) => void;
}) {
  const [panel, setPanel] = useState<EntitlementsPanel>("package");
  const [area, setArea] = useState<string>("all");
  const flagsByCategory = featureFlagsByCategory();
  const matchedPackage = useMemo(() => matchFeatureFlagPreset(featureFlags), [featureFlags]);
  const diff = useMemo(() => featureFlagsDiffFromDefaults(featureFlags), [featureFlags]);
  const preview = useMemo(() => previewEntitledSurfaces(featureFlags), [featureFlags]);

  const enabledCount = useMemo(
    () => Object.values(mergeFeatureFlags(featureFlags)).filter(Boolean).length,
    [featureFlags],
  );

  const changedIds = useMemo(
    () =>
      PLATFORM_FEATURE_FLAG_DEFS.filter(
        (def) => (featureFlags[def.id] ?? def.defaultEnabled) !== (savedFlags[def.id] ?? def.defaultEnabled),
      ).map((def) => def.id),
    [featureFlags, savedFlags],
  );
  const hasUnsavedChanges = JSON.stringify(featureFlags) !== JSON.stringify(savedFlags);

  const packageLabel =
    matchedPackage === "custom" ? "Custom" : FEATURE_FLAG_PRESETS.find((p) => p.id === matchedPackage)?.label;

  const visibleFlags = Object.entries(flagsByCategory)
    .filter(([category]) => area === "all" || category === area)
    .flatMap(([category, flags]) => flags.map((flag) => ({ category, flag })));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Package <span className="font-semibold text-ink">{packageLabel}</span>
          {billingPlan ? (
            <>
              , plan <span className="font-semibold text-ink">{billingPlan}</span>
            </>
          ) : null}
          , <span className="num font-semibold text-ink">{enabledCount}</span> modules on
        </p>
        <SegmentedToggle
          label="Entitlements view"
          onChange={(id) => setPanel(id as EntitlementsPanel)}
          options={[
            { id: "package", label: "Package" },
            { id: "modules", label: "Modules" },
            { id: "preview", label: "Preview" },
            { id: "diff", label: "Diff" },
          ]}
          value={panel}
        />
      </div>

      {panel === "package" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURE_FLAG_PRESETS.map((preset) => {
            const active = matchedPackage === preset.id;
            return (
              <button
                aria-pressed={active}
                className={cn(
                  "rounded-[14px] px-5 py-4 text-left transition-colors",
                  active
                    ? "border-[1.5px] border-blue bg-blue-soft"
                    : "border border-line bg-white hover:border-blue",
                )}
                key={preset.id}
                onClick={() => onApplyPackage(preset.id, applyFeatureFlagPreset(preset.id))}
                type="button"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-bold text-ink">{preset.label}</span>
                  {active ? <StatusPill tone="blue">Active</StatusPill> : null}
                </span>
                <span className="mt-1 block text-sm text-ink-2">{preset.description}</span>
                <span className="mt-2 block text-[13px] text-muted">Sets the plan to {preset.billingPlan}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {panel === "modules" ? (
        <div className="space-y-3">
          <FilterBar
            show={
              <div aria-label="Filter modules by area" className="flex flex-wrap gap-1.5" role="group">
                <Chip active={area === "all"} onClick={() => setArea("all")}>
                  All
                </Chip>
                {Object.keys(flagsByCategory).map((category) => (
                  <Chip active={area === category} key={category} onClick={() => setArea(category)}>
                    {FEATURE_FLAG_CATEGORY_LABELS[category] ?? category}
                  </Chip>
                ))}
              </div>
            }
          />
          <div className={TABLE_WRAP}>
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH} scope="col">Feature</th>
                    <th className={TH} scope="col">Area</th>
                    <th className={TH} scope="col">Depends on</th>
                    <th className={`${TH} text-right`} scope="col">On</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFlags.map(({ category, flag }) => {
                    const storedOn = featureFlags[flag.id] ?? flag.defaultEnabled;
                    const effective = isFlagEffectivelyEnabled(featureFlags, flag.id);
                    const parentBlocked = storedOn && !effective;
                    const changed = changedIds.includes(flag.id);
                    return (
                      <tr className={cn(TR, changed && rowHighlight.ready)} key={flag.id}>
                        <td className={TD}>
                          <p className="font-bold">
                            {flag.label}
                            {changed ? <ChangedMark /> : null}
                          </p>
                          <p className="text-[13px] text-muted">{flag.description}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {flag.kind === "ops" ? <Tag>Ops</Tag> : null}
                            {parentBlocked ? <StatusPill tone="warning">Needs parent</StatusPill> : null}
                          </div>
                        </td>
                        <td className={TD_MUTED}>
                          <Tag>{FEATURE_FLAG_CATEGORY_LABELS[category] ?? category}</Tag>
                        </td>
                        <td className={TD_META}>
                          {flag.dependsOn?.length
                            ? flag.dependsOn.map((id) => FLAG_LABELS.get(id) ?? id).join(", ")
                            : "—"}
                        </td>
                        <td className={`${TD} text-right`}>
                          <Toggle
                            changed={changed}
                            checked={storedOn}
                            label={flag.label}
                            onChange={(enabled) => onChange(applyFlagToggle(featureFlags, flag.id, enabled))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {panel === "preview" ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-2">Surfaces a user would see with these entitlements (nav and middleware).</p>
          <div className={TABLE_WRAP}>
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH} scope="col">Surface</th>
                    <th className={TH} scope="col">Route</th>
                    <th className={`${TH} text-right`} scope="col">Access</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((surface) => (
                    <tr className={TR} key={surface.id}>
                      <td className={`${TD} font-bold`}>{surface.label}</td>
                      <td className={TD_META}>{surface.href}</td>
                      <td className={`${TD} text-right`}>
                        {surface.allowed ? <StatusPill tone="success">Allowed</StatusPill> : <StatusPill tone="neutral">Blocked</StatusPill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {panel === "diff" ? (
        <div className={TABLE_WRAP}>
          {diff.length > 0 ? (
            <ul>
              {diff.map((item) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-b-0"
                  key={item.id}
                >
                  <span className="text-[15px] font-semibold text-ink">{item.label}</span>
                  <span className="flex items-center gap-3 text-[13px] text-muted">
                    Default {item.defaultEnabled ? "on" : "off"}, now
                    {item.effective ? <StatusPill tone="success">On</StatusPill> : <StatusPill tone="warning">Off</StatusPill>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyLine>All modules match platform defaults (Full package).</EmptyLine>
          )}
        </div>
      ) : null}

      <PlatformUnsavedBanner
        count={changedIds.length}
        onDiscard={onDiscard}
        onSave={onSave}
        saveLabel="Save entitlements"
        saving={saving}
        show={hasUnsavedChanges}
        summary={
          changedIds.length > 0
            ? changedIds
                .slice(0, 3)
                .map((id) => FLAG_LABELS.get(id) ?? id)
                .join(", ") + (changedIds.length > 3 ? ` and ${changedIds.length - 3} more` : "")
            : undefined
        }
      />
    </div>
  );
}
