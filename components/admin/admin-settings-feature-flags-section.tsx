"use client";

import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Toggle as AdminToggle } from "@/components/admin/admin-toggle";
import { Button } from "@/components/ui/button";
import {
  PLATFORM_FEATURE_FLAG_DEFS,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

export function AdminSettingsFeatureFlagsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  async function handleSave() {
    setSaving(true);
    const response = await fetch("/api/admin/platform-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureFlags }),
    });
    setSaving(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      toast.error(body.error ?? "Could not save feature flags.");
      return;
    }

    toast.success("Feature flags saved.");
    void load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#0033a1]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <p className="text-base font-bold text-[#0a1628]">Feature flags</p>
        <p className="text-xs text-[#64748b]">Toggle platform capabilities without redeploying code.</p>
      </div>

      <div className="rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px]">
        <div className="space-y-[12px]">
          {PLATFORM_FEATURE_FLAG_DEFS.map((flag) => (
            <div className="flex items-start justify-between gap-[12px] border-b border-[#f1f5f9] py-[10px] last:border-0" key={flag.id}>
              <div>
                <p className="mb-[2px] text-[12px] font-semibold text-[#1e293b]">{flag.label}</p>
                <p className="text-[10.5px] leading-[1.5] text-[#94a3b8]">{flag.description}</p>
              </div>
              <AdminToggle
                checked={featureFlags[flag.id] ?? flag.defaultEnabled}
                className="mt-[2px] flex-shrink-0"
                onChange={(enabled) => setFeatureFlags((current) => ({ ...current, [flag.id]: enabled }))}
              />
            </div>
          ))}
        </div>
      </div>

      <Button disabled={saving} onClick={() => void handleSave()} type="button">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save feature flags
      </Button>
    </div>
  );
}
