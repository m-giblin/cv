"use client";

import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Prefs = {
  emailOnCriticalSupport: boolean;
  emailOnNewTenant: boolean;
  emailDigestHours: number;
  channels: { in_app: boolean; email: boolean };
};

const DEFAULTS: Prefs = {
  emailOnCriticalSupport: true,
  emailOnNewTenant: true,
  emailDigestHours: 24,
  channels: { in_app: true, email: true },
};

export function PlatformOperatorSettings() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/platform/operator-prefs")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!body?.prefs) return;
        const incoming = body.prefs as Prefs & { channels?: Record<string, unknown> };
        setPrefs({
          emailOnCriticalSupport: incoming.emailOnCriticalSupport ?? DEFAULTS.emailOnCriticalSupport,
          emailOnNewTenant: incoming.emailOnNewTenant ?? DEFAULTS.emailOnNewTenant,
          emailDigestHours: incoming.emailDigestHours ?? DEFAULTS.emailDigestHours,
          channels: {
            in_app: Boolean(incoming.channels?.in_app ?? true),
            email: Boolean(incoming.channels?.email ?? true),
          },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/platform/operator-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not save preferences.");
      return;
    }
    toast.success("Operator preferences saved.");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#0071CE]" />
      </div>
    );
  }

  return (
    <div className="max-w-xl border border-[#E2DFD9] bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0D0E12]">Operator notifications</h2>
          <p className="mt-1 text-sm text-[#6B6860]">
            How you get notified about platform events. Applies to your Super Admin account.
          </p>
        </div>
        <Button disabled={saving} onClick={() => void save()} type="button">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>

      <div className="space-y-3 text-sm">
        {(
          [
            ["emailOnCriticalSupport", "Email on critical support tickets"],
            ["emailOnNewTenant", "Email when a new tenant is created"],
            ["channels.in_app", "In-app notifications"],
            ["channels.email", "Email channel enabled"],
          ] as const
        ).map(([key, label]) => {
          const checked =
            key === "channels.in_app"
              ? prefs.channels.in_app
              : key === "channels.email"
                ? prefs.channels.email
                : prefs[key as "emailOnCriticalSupport" | "emailOnNewTenant"];
          return (
            <label className="flex items-center gap-2.5" key={key}>
              <input
                checked={checked}
                onChange={(event) => {
                  const value = event.target.checked;
                  if (key === "channels.in_app") {
                    setPrefs((p) => ({ ...p, channels: { ...p.channels, in_app: value } }));
                  } else if (key === "channels.email") {
                    setPrefs((p) => ({ ...p, channels: { ...p.channels, email: value } }));
                  } else {
                    setPrefs((p) => ({ ...p, [key]: value }));
                  }
                }}
                type="checkbox"
              />
              <span className="text-[#3D3C38]">{label}</span>
            </label>
          );
        })}

        <label className="block pt-2">
          <span className="mb-1 block text-xs font-medium text-[#6B6860]">Digest interval (hours)</span>
          <input
            className="w-32 border border-[#E2DFD9] px-3 py-2"
            min={1}
            max={168}
            onChange={(event) =>
              setPrefs((p) => ({ ...p, emailDigestHours: Number(event.target.value) || 24 }))
            }
            type="number"
            value={prefs.emailDigestHours}
          />
        </label>
      </div>
    </div>
  );
}
