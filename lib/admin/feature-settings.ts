import { FEATURE_FLAG_PRESETS } from "@/lib/platform/flag-presets";
import {
  PLATFORM_FEATURE_FLAG_DEFS,
  applyFlagToggle,
  isFlagEffectivelyEnabled,
  mergeFeatureFlags,
  type FeatureFlagCategory,
  type PlatformFeatureFlagDef,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

/** Features a tenant admin may never switch off from inside the tenant. */
const ALWAYS_LOCKED = new Set(["tenant-admin-console"]);

/**
 * Security policy: feature flags are managed by the platform operator, so tenant admins see every
 * feature as LOCKED and the settings API rejects their changes. Set to true to let tenant admins
 * switch features their billing plan includes (plan-excluded features stay locked).
 */
export const TENANT_ADMINS_CAN_EDIT_FEATURES = false;

export const FEATURE_AREA_LABELS: Record<FeatureFlagCategory, string> = {
  workspace: "Workspace",
  manager: "Manager",
  readiness: "Readiness",
  practice: "Practice",
  integrations: "Integrations",
  admin: "Admin",
};

const AREA_AUDIENCE: Record<FeatureFlagCategory, string> = {
  workspace: "SEs",
  manager: "Managers",
  readiness: "Everyone",
  practice: "SEs, managers",
  integrations: "SEs",
  admin: "Admins",
};

const AUDIENCE_OVERRIDES: Record<string, string> = {
  "ramp-plans": "SEs, managers",
  "ai-features": "Everyone",
  "buyer-shares": "SEs, buyers",
  "agentic-ai-track": "Everyone",
};

export function featureAudience(def: PlatformFeatureFlagDef): string {
  return AUDIENCE_OVERRIDES[def.id] ?? AREA_AUDIENCE[def.category];
}

export function featureLabel(id: string): string {
  return PLATFORM_FEATURE_FLAG_DEFS.find((def) => def.id === id)?.label ?? id;
}

/**
 * Feature ids the tenant cannot change: anything the tenant's commercial plan switches off (the
 * platform plan), plus the admin console itself. Unknown or custom plans lock only the console.
 */
export function lockedFeatureIds(billingPlan: string | null | undefined): string[] {
  if (!TENANT_ADMINS_CAN_EDIT_FEATURES) return PLATFORM_FEATURE_FLAG_DEFS.map((def) => def.id);
  return planLockedFeatureIds(billingPlan);
}

/** Plan-based locks used when tenant admins may edit features. */
export function planLockedFeatureIds(billingPlan: string | null | undefined): string[] {
  const preset = FEATURE_FLAG_PRESETS.find((entry) => entry.billingPlan === billingPlan);
  const locked = new Set(ALWAYS_LOCKED);
  for (const [id, enabled] of Object.entries(preset?.flags ?? {})) {
    if (enabled === false) locked.add(id);
  }
  return [...locked];
}

/** Ids whose effective state differs between two flag sets. */
export function changedFeatureIds(before: PlatformFeatureFlags, after: PlatformFeatureFlags): string[] {
  const a = mergeFeatureFlags(before);
  const b = mergeFeatureFlags(after);
  return PLATFORM_FEATURE_FLAG_DEFS.filter(
    (def) => isFlagEffectivelyEnabled(a, def.id) !== isFlagEffectivelyEnabled(b, def.id),
  ).map((def) => def.id);
}

/**
 * Applies a toggle with dependency cascade. Returns null when the cascade would touch a locked feature
 * (for example enabling a feature whose parent the platform plan switches off).
 */
export function toggleFeature(
  flags: PlatformFeatureFlags,
  id: string,
  enabled: boolean,
  locked: readonly string[],
): PlatformFeatureFlags | null {
  if (locked.includes(id)) return null;
  const next = applyFlagToggle(flags, id, enabled);
  const touched = changedFeatureIds(flags, next);
  return touched.some((touchedId) => locked.includes(touchedId)) ? null : next;
}
