import {
  featureFlagsByCategory,
  mergeFeatureFlags,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

const CATEGORY_LABELS: Record<string, string> = {
  workspace: "Workspace",
  manager: "Manager",
  readiness: "Readiness",
  practice: "Practice",
  integrations: "Integrations",
  admin: "Admin",
};

export type FeatureFlagCategorySummary = {
  category: string;
  enabled: number;
  total: number;
  color: string;
  pct: number;
};

export function buildFeatureFlagCategorySummary(
  flags: PlatformFeatureFlags | null | undefined,
): { rows: FeatureFlagCategorySummary[]; enabledTotal: number; total: number } {
  const merged = mergeFeatureFlags(flags);
  const grouped = featureFlagsByCategory();
  const rows: FeatureFlagCategorySummary[] = [];
  let enabledTotal = 0;
  let total = 0;

  Object.entries(grouped).forEach(([category, defs], index) => {
    const enabled = defs.filter((flag) => merged[flag.id]).length;
    const count = defs.length;
    enabledTotal += enabled;
    total += count;
    rows.push({
      category: CATEGORY_LABELS[category] ?? category,
      enabled,
      total: count,
      color: enabled === count ? "#0A6E45" : enabled === 0 ? "#B83128" : "#D4810A",
      pct: count > 0 ? Math.round((enabled / count) * 100) : 0,
    });
  });

  // Stable order matching design handoff
  const order = ["Workspace", "Manager", "Readiness", "Practice", "Integrations", "Admin"];
  rows.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));

  return { rows, enabledTotal, total };
}
