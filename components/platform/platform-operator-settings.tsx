"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { PlatformUnsavedBanner } from "@/components/platform/platform-unsaved-banner";
import { FIELD_HINT, FIELD_LABEL, LineCard, Spinner, Toggle } from "@/components/platform/platform-ui";
import { Input } from "@/components/ui/input";
import { isFormDirty } from "@/lib/platform/use-dirty-form";

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
  const digestId = useId();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [savedPrefs, setSavedPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/platform/operator-prefs")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!body?.prefs) return;
        const incoming = body.prefs as Prefs & { channels?: Record<string, unknown> };
        const loaded: Prefs = {
          emailOnCriticalSupport: incoming.emailOnCriticalSupport ?? DEFAULTS.emailOnCriticalSupport,
          emailOnNewTenant: incoming.emailOnNewTenant ?? DEFAULTS.emailOnNewTenant,
          emailDigestHours: incoming.emailDigestHours ?? DEFAULTS.emailDigestHours,
          channels: {
            in_app: Boolean(incoming.channels?.in_app ?? true),
            email: Boolean(incoming.channels?.email ?? true),
          },
        };
        setPrefs(loaded);
        setSavedPrefs(loaded);
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
    setSavedPrefs(prefs);
  }

  const dirty = isFormDirty(prefs, savedPrefs);
  const changedCount =
    Number(prefs.emailOnCriticalSupport !== savedPrefs.emailOnCriticalSupport) +
    Number(prefs.emailOnNewTenant !== savedPrefs.emailOnNewTenant) +
    Number(prefs.emailDigestHours !== savedPrefs.emailDigestHours) +
    Number(prefs.channels.in_app !== savedPrefs.channels.in_app) +
    Number(prefs.channels.email !== savedPrefs.channels.email);

  if (loading) return <Spinner label="Loading preferences" />;

  const rows = [
    ["emailOnCriticalSupport", "Email on critical support tickets", "Sent as soon as a critical ticket is opened."],
    ["emailOnNewTenant", "Email when a new tenant is created", "Includes the tenant name and first admin."],
    ["channels.in_app", "In-app notifications", "Shown in the notifications panel in the sidebar."],
    ["channels.email", "Email channel", "Turn off to stop every operator email."],
  ] as const;

  function valueOf(key: (typeof rows)[number][0], source: Prefs) {
    if (key === "channels.in_app") return source.channels.in_app;
    if (key === "channels.email") return source.channels.email;
    return source[key];
  }

  function setValue(key: (typeof rows)[number][0], value: boolean) {
    if (key === "channels.in_app") {
      setPrefs((p) => ({ ...p, channels: { ...p.channels, in_app: value } }));
    } else if (key === "channels.email") {
      setPrefs((p) => ({ ...p, channels: { ...p.channels, email: value } }));
    } else {
      setPrefs((p) => ({ ...p, [key]: value }));
    }
  }

  return (
    <div>
      <LineCard className="max-w-3xl" meta="Your super admin account" title="Operator notifications">
        <ul>
          {rows.map(([key, label, hint]) => {
            const checked = valueOf(key, prefs);
            const changed = checked !== valueOf(key, savedPrefs);
            return (
              <li
                className={`flex items-center justify-between gap-4 border-b border-divider px-5 py-3.5 ${changed ? "bg-signal-soft" : ""}`}
                key={key}
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-ink">{label}</p>
                  <p className="text-sm text-muted">{hint}</p>
                </div>
                <Toggle changed={changed} checked={checked} label={label} onChange={(value) => setValue(key, value)} />
              </li>
            );
          })}
          <li className="px-5 py-4">
            <label className={FIELD_LABEL} htmlFor={digestId}>
              Digest interval (hours)
            </label>
            <Input
              className="w-32"
              id={digestId}
              max={168}
              min={1}
              onChange={(event) =>
                setPrefs((p) => ({ ...p, emailDigestHours: Number(event.target.value) || 24 }))
              }
              type="number"
              value={prefs.emailDigestHours}
            />
            <p className={FIELD_HINT}>Between 1 and 168 hours.</p>
          </li>
        </ul>
      </LineCard>

      <PlatformUnsavedBanner
        count={changedCount}
        onDiscard={() => setPrefs(savedPrefs)}
        onSave={() => void save()}
        saving={saving}
        show={dirty}
        summary="Operator notifications"
      />
    </div>
  );
}
