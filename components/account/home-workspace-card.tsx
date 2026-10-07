"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type HomeSettings = { homeTenantId: string | null; level: string; tenants: { id: string; name: string }[]; ready: boolean };

const INPUT = "w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] text-ink";

/**
 * Super admins only: the workspace you train in as an SE, and your level there. You show up in
 * that workspace's People list, so you can be enrolled, assigned work and given a manager.
 */
export function HomeWorkspaceCard() {
  const [settings, setSettings] = useState<HomeSettings | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [level, setLevel] = useState("Basic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/account/home")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: HomeSettings | null) => {
        if (!body) return;
        setSettings(body);
        setTenantId(body.homeTenantId ?? "");
        setLevel(body.level);
      });
  }, []);

  if (!settings) return null;

  async function save() {
    setSaving(true);
    const response = await fetch("/api/account/home", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeTenantId: tenantId || null, level }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) return toast.error(body.error ?? "Couldn't save.");
    const name = settings?.tenants.find((tenant) => tenant.id === tenantId)?.name;
    toast.success(name ? `Home workspace set to ${name}` : "Home workspace cleared");
    setSettings((current) => (current ? { ...current, homeTenantId: tenantId || null, level } : current));
  }

  return (
    <section className="mt-6 flex max-w-[640px] flex-col gap-4 rounded-[14px] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <div>
        <h2 className="text-[18px] font-extrabold text-ink">Your home workspace</h2>
        <p className="text-sm text-muted">
          Where you train as an SE. You appear in its People list, so its admins and managers can enroll you in programs and assign you
          work. You keep full super-admin access everywhere. Change it whenever you like.
        </p>
      </div>
      {!settings.ready ? (
        <p className="rounded-[10px] bg-warning-soft px-3 py-2 text-sm text-ink">Apply the home workspace database migration to turn this on.</p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Workspace
          <select className={INPUT} onChange={(event) => setTenantId(event.target.value)} value={tenantId}>
            <option value="">None (platform only)</option>
            {settings.tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Your SE level
          <select className={INPUT} onChange={(event) => setLevel(event.target.value)} value={level}>
            <option>Basic</option>
            <option>Senior</option>
            <option>Advisory</option>
          </select>
        </label>
      </div>
      <p className="text-[13px] text-muted">
        Level decides which certification gates count toward your next level and how the AI coach pitches its feedback.
      </p>
      <div>
        <button
          className="btn-primary"
          disabled={saving || !settings.ready || (tenantId === (settings.homeTenantId ?? "") && level === settings.level)}
          onClick={() => void save()}
          type="button"
        >
          {saving ? "Saving" : "Save"}
        </button>
      </div>
    </section>
  );
}
