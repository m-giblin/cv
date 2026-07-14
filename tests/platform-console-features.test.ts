import { describe, expect, it } from "vitest";
import {
  applyFeatureFlagPreset,
  featureFlagsDiffFromDefaults,
  FEATURE_FLAG_PRESETS,
} from "@/lib/platform/flag-presets";
import { defaultFeatureFlags } from "@/lib/platform/settings-shared";

describe("feature flag presets", () => {
  it("exposes named presets", () => {
    expect(FEATURE_FLAG_PRESETS.map((preset) => preset.id)).toEqual([
      "full",
      "se-only",
      "ae-pilot",
      "manager-lite",
    ]);
  });

  it("applies se-only preset", () => {
    const flags = applyFeatureFlagPreset("se-only");
    expect(flags["manager-portal"]).toBe(false);
    expect(flags["tenant-admin-console"]).toBe(false);
    expect(flags["isc-lab"]).toBe(defaultFeatureFlags()["isc-lab"]);
  });

  it("applies ae-pilot preset with lean modules", () => {
    const flags = applyFeatureFlagPreset("ae-pilot");
    expect(flags["isc-lab"]).toBe(false);
    expect(flags["program-tracker"]).toBe(false);
    expect(flags["tenant-admin-console"]).toBe(true);
  });

  it("full preset matches defaults", () => {
    const flags = applyFeatureFlagPreset("full");
    expect(flags).toEqual(defaultFeatureFlags());
  });

  it("diff highlights non-default flags", () => {
    const flags = applyFeatureFlagPreset("se-only");
    const diff = featureFlagsDiffFromDefaults(flags);
    expect(diff.some((item) => item.id === "manager-portal" && !item.effective)).toBe(true);
    expect(diff.length).toBeGreaterThan(0);
  });
});

describe("tenant admin feature flag policy", () => {
  it("documents platform-only flag management in admin API", async () => {
    const fs = await import("fs/promises");
    const source = await fs.readFile("app/api/admin/platform-settings/route.ts", "utf8");
    expect(source).toContain("Feature flags are managed by the platform operator");
    expect(source).toContain("status: 403");
  });
});

describe("platform support schema", () => {
  it("migration defines support_requests table", async () => {
    const fs = await import("fs/promises");
    const migration = await fs.readFile(
      "supabase/migrations/20260811140000_platform_support_requests.sql",
      "utf8",
    );
    expect(migration).toContain("create table if not exists public.support_requests");
    expect(migration).toContain("operator_notes");
  });

  it("platform overview API route exists", async () => {
    const fs = await import("fs/promises");
    const source = await fs.readFile("app/api/platform/overview/route.ts", "utf8");
    expect(source).toContain("listTenantHealthSummaries");
  });
});
