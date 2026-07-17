import {
  defaultFeatureFlags,
  isFlagEffectivelyEnabled,
  mergeFeatureFlags,
  PLATFORM_FEATURE_FLAG_DEFS,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

export type FeatureFlagPresetId = "full" | "se-only" | "ae-pilot" | "manager-lite";

export type FeatureFlagPreset = {
  id: FeatureFlagPresetId;
  label: string;
  description: string;
  /** Commercial plan slug written when this package is applied. */
  billingPlan: string;
  flags: Partial<PlatformFeatureFlags>;
};

export const FEATURE_FLAG_PRESETS: FeatureFlagPreset[] = [
  {
    id: "full",
    label: "Full platform",
    description: "Enterprise package — all product modules on (ops defaults apply).",
    billingPlan: "enterprise",
    flags: {},
  },
  {
    id: "se-only",
    label: "SE only",
    description: "Workspace + practice; no manager modules or tenant admin.",
    billingPlan: "se-only",
    flags: {
      "manager-portal": false,
      "coaching-cadence": false,
      "readiness-map": false,
      "program-tracker": false,
      "assign-plans": false,
      "plan-calendar": false,
      "leaderboard": false,
      "manager-dev": false,
      "tenant-admin-console": false,
    },
  },
  {
    id: "ae-pilot",
    label: "AE pilot",
    description: "Lean pilot: SE workspace, challenges, sims, tenant admin; limited manager.",
    billingPlan: "ae-pilot",
    flags: {
      "isc-lab": false,
      "gong-integration": false,
      "buyer-shares": false,
      "market-pulse": false,
      "pitch-studio": false,
      "flight-check": false,
      "agentic-ai-track": false,
      "program-tracker": false,
      "assign-plans": false,
      "leaderboard": false,
      "readiness-map": false,
      "plan-calendar": false,
      "manager-dev": false,
    },
  },
  {
    id: "manager-lite",
    label: "Manager lite",
    description: "SE tools + manager core/cadence without program tracker or assign.",
    billingPlan: "manager-lite",
    flags: {
      "program-tracker": false,
      "assign-plans": false,
      "plan-calendar": false,
      "gong-integration": false,
      "agentic-ai-track": false,
    },
  },
];

/** Collapse dependent flags so stored state matches effective state. */
export function normalizeFeatureFlags(flags: PlatformFeatureFlags): PlatformFeatureFlags {
  const merged = mergeFeatureFlags(flags);
  const next = { ...merged };
  for (const def of PLATFORM_FEATURE_FLAG_DEFS) {
    next[def.id] = isFlagEffectivelyEnabled(merged, def.id);
  }
  return next;
}

export function applyFeatureFlagPreset(presetId: FeatureFlagPresetId): PlatformFeatureFlags {
  const preset = FEATURE_FLAG_PRESETS.find((entry) => entry.id === presetId);
  if (!preset || presetId === "full") {
    return defaultFeatureFlags();
  }
  return normalizeFeatureFlags(
    mergeFeatureFlags({ ...defaultFeatureFlags(), ...preset.flags } as PlatformFeatureFlags),
  );
}

export function billingPlanForPreset(presetId: FeatureFlagPresetId): string {
  return FEATURE_FLAG_PRESETS.find((entry) => entry.id === presetId)?.billingPlan ?? "enterprise";
}

export function matchFeatureFlagPreset(flags: PlatformFeatureFlags): FeatureFlagPresetId | "custom" {
  const merged = normalizeFeatureFlags(flags);
  for (const preset of FEATURE_FLAG_PRESETS) {
    const applied = applyFeatureFlagPreset(preset.id);
    const same = PLATFORM_FEATURE_FLAG_DEFS.every((def) => applied[def.id] === merged[def.id]);
    if (same) return preset.id;
  }
  return "custom";
}

export function featureFlagsDiffFromDefaults(flags: PlatformFeatureFlags): Array<{
  id: string;
  label: string;
  defaultEnabled: boolean;
  effective: boolean;
}> {
  const defaults = defaultFeatureFlags();
  const merged = normalizeFeatureFlags(flags);

  return PLATFORM_FEATURE_FLAG_DEFS.filter((def) => merged[def.id] !== defaults[def.id]).map((def) => ({
    id: def.id,
    label: def.label,
    defaultEnabled: Boolean(defaults[def.id]),
    effective: Boolean(merged[def.id]),
  }));
}

export function featureFlagsDiffBetween(
  before: PlatformFeatureFlags,
  after: PlatformFeatureFlags,
): Array<{ id: string; label: string; from: boolean; to: boolean }> {
  const a = normalizeFeatureFlags(before);
  const b = normalizeFeatureFlags(after);
  return PLATFORM_FEATURE_FLAG_DEFS.filter((def) => a[def.id] !== b[def.id]).map((def) => ({
    id: def.id,
    label: def.label,
    from: Boolean(a[def.id]),
    to: Boolean(b[def.id]),
  }));
}
