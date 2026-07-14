import {
  defaultFeatureFlags,
  mergeFeatureFlags,
  PLATFORM_FEATURE_FLAG_DEFS,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

export type FeatureFlagPresetId = "full" | "se-only" | "ae-pilot" | "manager-lite";

export type FeatureFlagPreset = {
  id: FeatureFlagPresetId;
  label: string;
  description: string;
  flags: Partial<PlatformFeatureFlags>;
};

export const FEATURE_FLAG_PRESETS: FeatureFlagPreset[] = [
  {
    id: "full",
    label: "Full platform",
    description: "All modules enabled (default enterprise package).",
    flags: {},
  },
  {
    id: "se-only",
    label: "SE only",
    description: "Workspace + practice tools; no manager portal or admin console.",
    flags: {
      "manager-portal": false,
      "program-tracker": false,
      "assign-plans": false,
      "leaderboard": false,
      "tenant-admin-console": false,
    },
  },
  {
    id: "ae-pilot",
    label: "AE pilot",
    description: "Lean pilot: core SE workspace, challenges, sims, tenant admin.",
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
    },
  },
  {
    id: "manager-lite",
    label: "Manager lite",
    description: "SE tools + manager command center without program tracker / assign.",
    flags: {
      "program-tracker": false,
      "assign-plans": false,
      "gong-integration": false,
      "agentic-ai-track": false,
    },
  },
];

export function applyFeatureFlagPreset(presetId: FeatureFlagPresetId): PlatformFeatureFlags {
  const preset = FEATURE_FLAG_PRESETS.find((entry) => entry.id === presetId);
  if (!preset || presetId === "full") {
    return defaultFeatureFlags();
  }
  return mergeFeatureFlags({ ...defaultFeatureFlags(), ...preset.flags } as PlatformFeatureFlags);
}

export function featureFlagsDiffFromDefaults(flags: PlatformFeatureFlags): Array<{
  id: string;
  label: string;
  defaultEnabled: boolean;
  effective: boolean;
}> {
  const defaults = defaultFeatureFlags();
  const merged = mergeFeatureFlags(flags);

  return PLATFORM_FEATURE_FLAG_DEFS.filter((def) => merged[def.id] !== defaults[def.id]).map((def) => ({
    id: def.id,
    label: def.label,
    defaultEnabled: defaults[def.id],
    effective: merged[def.id],
  }));
}
