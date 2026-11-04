"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type WorkspaceSettings = {
  homeTenantId: string | null;
  memberTenantIds: string[];
  level: string;
  tenants: { id: string; name: string }[];
  ready: boolean;
  multiReady?: boolean;
};

const INPUT = "w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] text-ink";

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * Super admins only: the workspaces you belong to. You appear in each one's People list, so its
 * admins can give you a manager or assign you people to manage and mentor, all from this one
 * sign-in. Your default workspace is where you train as an SE. Change them whenever you like.
 */
export function HomeWorkspaceCard() {
  const router = useRouter();
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [homeId, setHomeId] = useState("");
  const [level, setLevel] = useState("Basic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/account/home")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: WorkspaceSettings | null) => {
        if (!body) return;
        setSettings(body);
        setMembers(body.memberTenantIds ?? (body.homeTenantId ? [body.homeTenantId] : []));
        setHomeId(body.homeTenantId ?? "");
        setLevel(body.level);
      });
  }, []);

  if (!settings) return null;
  const multi = settings.multiReady !== false;

  function toggle(tenantId: string) {
    if (members.includes(tenantId)) {
      const next = members.filter((id) => id !== tenantId);
      setMembers(next);
      if (homeId === tenantId) setHomeId(next[0] ?? "");
      return;
    }
    setMembers(multi ? [...members, tenantId] : [tenantId]);
    if (!homeId || !multi) setHomeId(tenantId);
  }

  async function save() {
    setSaving(true);
    const response = await fetch("/api/account/home", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeTenantId: homeId || null, memberTenantIds: members, level }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) return toast.error(body.error ?? "Couldn't save.");
    toast.success(
      members.length === 0
        ? "You're no longer in any workspace"
        : `You're in ${members.length} workspace${members.length === 1 ? "" : "s"}`,
    );
    setSettings((current) => (current ? { ...current, homeTenantId: homeId || null, memberTenantIds: members, level } : current));
    // The top bar lists your workspaces, so refresh it.
    router.refresh();
  }

  const unchanged =
    sameSet(members, settings.memberTenantIds ?? []) && homeId === (settings.homeTenantId ?? "") && level === settings.level;

  return (
    <section className="mt-6 flex max-w-[640px] flex-col gap-4 rounded-[14px] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <div>
        <h2 className="text-[18px] font-extrabold text-ink">Your workspaces</h2>
        <p className="text-sm text-muted">
          The workspaces you&apos;re part of, all with this one sign-in. You appear in each one&apos;s People list, so you can
          manage and mentor people there and be enrolled in its programs. Switch between them from the workspace menu in the
          top bar. You keep full super-admin access everywhere.
        </p>
      </div>
      {!settings.ready ? (
        <p className="rounded-[10px] bg-warning-soft px-3 py-2 text-sm text-ink">Apply the home workspace database migration to turn this on.</p>
      ) : !multi ? (
        <p className="rounded-[10px] bg-warning-soft px-3 py-2 text-sm text-ink">
          Apply the workspaces database migration to join more than one workspace.
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1.5 text-sm font-semibold text-ink">Workspaces</legend>
        {settings.tenants.map((tenant) => {
          const checked = members.includes(tenant.id);
          return (
            <div className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-1.5 hover:bg-bg" key={tenant.id}>
              <label className="flex min-w-0 items-center gap-2.5 text-[15px] text-ink">
                <input checked={checked} className="h-4 w-4" onChange={() => toggle(tenant.id)} type="checkbox" />
                <span className="truncate">{tenant.name}</span>
              </label>
              {checked ? (
                homeId === tenant.id ? (
                  <span className="shrink-0 rounded-full bg-blue-soft px-2.5 py-0.5 text-[12px] font-bold text-blue">Default</span>
                ) : (
                  <button className="shrink-0 text-[13px] font-semibold text-blue underline-offset-2 hover:underline" onClick={() => setHomeId(tenant.id)} type="button">
                    Make default
                  </button>
                )
              ) : null}
            </div>
          );
        })}
      </fieldset>
      <p className="text-[13px] text-muted">Your default workspace is where you train as an SE.</p>

      <label className="flex max-w-[200px] flex-col gap-1.5 text-sm font-semibold text-ink">
        Your level
        <select className={INPUT} onChange={(event) => setLevel(event.target.value)} value={level}>
          <option>Basic</option>
          <option>Senior</option>
          <option>Advisory</option>
        </select>
      </label>
      <p className="text-[13px] text-muted">
        Level decides which certification gates count toward your next level and how the AI coach pitches its feedback.
      </p>
      <div>
        <button className="btn-primary" disabled={saving || !settings.ready || unchanged} onClick={() => void save()} type="button">
          {saving ? "Saving" : "Save"}
        </button>
      </div>
    </section>
  );
}
