"use client";

import { Download, Loader2, RefreshCw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type {
  Tenant,
  TenantAdminInvite,
  TenantBillingStatus,
  TenantCustomDomainStatus,
} from "@/lib/tenant/types";

export function PlatformInviteList({
  invites,
  onChanged,
}: {
  invites: TenantAdminInvite[];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function runAction(inviteId: string, tenantId: string, action: "resend" | "revoke") {
    setBusyId(inviteId);
    const response = await fetch(`/api/platform/tenants/${tenantId}/invites/${inviteId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    if (!response.ok) {
      toast.error(action === "resend" ? "Could not resend invite." : "Could not revoke invite.");
      return;
    }
    toast.success(action === "resend" ? "Invite resent." : "Invite revoked.");
    onChanged();
  }

  if (invites.length === 0) {
    return <p className="text-sm text-[#6B6860]">No admin invites yet.</p>;
  }

  return (
    <div className="space-y-2">
      {invites.map((invite) => (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border border-[#ECEAE6] px-3 py-2 text-sm"
          key={invite.id}
        >
          <div>
            <p className="font-medium text-[#0D0E12]">{invite.fullName}</p>
            <p className="text-xs text-[#A09D98]">
              {invite.email}
              {invite.lastSentAt
                ? ` · sent ${new Date(invite.lastSentAt).toLocaleDateString()}`
                : ""}
              {invite.expiresAt
                ? ` · expires ${new Date(invite.expiresAt).toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wide text-[#6B6860]">
              {invite.status}
            </span>
            {invite.status === "pending" ? (
              <>
                <Button
                  disabled={busyId === invite.id}
                  onClick={() => void runAction(invite.id, invite.tenantId, "resend")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {busyId === invite.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Resend
                </Button>
                <Button
                  disabled={busyId === invite.id}
                  onClick={() => void runAction(invite.id, invite.tenantId, "revoke")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Revoke
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlatformCommercialPanel({
  tenant,
  onSaved,
}: {
  tenant: Tenant;
  onSaved: (tenant: Tenant) => void;
}) {
  const [billingStatus, setBillingStatus] = useState<TenantBillingStatus>(tenant.billingStatus);
  const [billingPlan, setBillingPlan] = useState(tenant.billingPlan ?? "");
  const [seatQuota, setSeatQuota] = useState(tenant.seatQuota?.toString() ?? "");
  const [customDomain, setCustomDomain] = useState(tenant.customDomain ?? "");
  const [customDomainStatus, setCustomDomainStatus] = useState<TenantCustomDomainStatus>(
    tenant.customDomainStatus,
  );
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setBillingStatus(tenant.billingStatus);
    setBillingPlan(tenant.billingPlan ?? "");
    setSeatQuota(tenant.seatQuota?.toString() ?? "");
    setCustomDomain(tenant.customDomain ?? "");
    setCustomDomainStatus(tenant.customDomainStatus);
  }, [tenant]);

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/platform/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: JSON.stringify({
        billingStatus,
        billingPlan: billingPlan || null,
        seatQuota: seatQuota === "" ? null : Number(seatQuota),
        customDomain: customDomain || null,
        customDomainStatus,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not save commercial settings.");
      return;
    }
    const body = (await response.json()) as { tenant: Tenant };
    onSaved(body.tenant);
    toast.success("Commercial settings saved.");
  }

  async function runExport() {
    setExporting(true);
    const queue = await fetch(`/api/platform/tenants/${tenant.id}/export`, {
      method: "POST",
      headers: { "x-requested-with": "XMLHttpRequest" },
    });
    if (!queue.ok) {
      setExporting(false);
      toast.error("Could not start export.");
      return;
    }
    const download = await fetch(`/api/platform/tenants/${tenant.id}/export`);
    setExporting(false);
    if (!download.ok) {
      toast.error("Export not ready.");
      return;
    }
    const blob = await download.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${tenant.slug}-export.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Tenant export downloaded.");
  }

  async function softDelete() {
    if (!window.confirm(`Suspend and offboard ${tenant.name}? This soft-deletes the tenant.`)) {
      return;
    }
    const response = await fetch(`/api/platform/tenants/${tenant.id}`, {
      method: "DELETE",
      headers: { "x-requested-with": "XMLHttpRequest" },
    });
    if (!response.ok) {
      toast.error("Could not offboard tenant.");
      return;
    }
    toast.success("Tenant suspended (soft delete).");
    const body = (await response.json().catch(() => null)) as { tenant?: Tenant } | null;
    if (body?.tenant) onSaved(body.tenant);
  }

  return (
    <div className="space-y-4">
      <div className="border border-[#E2DFD9] bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-[#0D0E12]">Commercial</h3>
            <p className="text-sm text-[#6B6860]">Billing status, plan, and seat quota.</p>
          </div>
          <Button disabled={saving} onClick={() => void save()} type="button">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-[#6B6860]">Billing status</span>
            <select
              className="w-full border border-[#E2DFD9] px-3 py-2"
              onChange={(e) => setBillingStatus(e.target.value as TenantBillingStatus)}
              value={billingStatus}
            >
              {["trial", "active", "past_due", "canceled", "exempt"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-[#6B6860]">Plan</span>
            <input
              className="w-full border border-[#E2DFD9] px-3 py-2"
              onChange={(e) => setBillingPlan(e.target.value)}
              placeholder="enterprise / ae-pilot / …"
              value={billingPlan}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-[#6B6860]">Seat quota</span>
            <input
              className="w-full border border-[#E2DFD9] px-3 py-2"
              onChange={(e) => setSeatQuota(e.target.value)}
              placeholder="Unlimited"
              type="number"
              value={seatQuota}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-[#6B6860]">Custom domain</span>
            <input
              className="w-full border border-[#E2DFD9] px-3 py-2"
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="enablement.acme.com"
              value={customDomain}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-[#6B6860]">Domain status</span>
            <select
              className="w-full border border-[#E2DFD9] px-3 py-2 sm:max-w-xs"
              onChange={(e) => setCustomDomainStatus(e.target.value as TenantCustomDomainStatus)}
              value={customDomainStatus}
            >
              {["none", "pending", "verified", "failed"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border border-[#E2DFD9] bg-white p-4">
        <Button disabled={exporting} onClick={() => void runExport()} type="button" variant="outline">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export tenant JSON
        </Button>
        <Button onClick={() => void softDelete()} type="button" variant="outline">
          <Trash2 className="h-4 w-4" />
          Offboard (suspend)
        </Button>
        <p className="w-full text-xs text-[#A09D98]">
          Export status: {tenant.exportStatus}
          {tenant.exportCompletedAt
            ? ` · ${new Date(tenant.exportCompletedAt).toLocaleString()}`
            : ""}
        </p>
      </div>
    </div>
  );
}

export function PlatformSsoPanel({ tenantId }: { tenantId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState<"saml" | "oidc">("saml");
  const [ssoDomain, setSsoDomain] = useState("");
  const [metadataJson, setMetadataJson] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/platform/tenants/${tenantId}/sso`);
    setLoading(false);
    if (!response.ok) return;
    const body = (await response.json()) as {
      config: {
        enabled: boolean;
        provider: "saml" | "oidc";
        ssoDomain: string | null;
        metadata: Record<string, unknown>;
      } | null;
    };
    if (body.config) {
      setEnabled(body.config.enabled);
      setProvider(body.config.provider);
      setSsoDomain(body.config.ssoDomain ?? "");
      setMetadataJson(JSON.stringify(body.config.metadata ?? {}, null, 2));
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(metadataJson) as Record<string, unknown>;
    } catch {
      toast.error("Metadata must be valid JSON.");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/platform/tenants/${tenantId}/sso`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: JSON.stringify({ enabled, provider, ssoDomain: ssoDomain || null, metadata }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not save SSO config.");
      return;
    }
    toast.success("SSO config saved.");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-[#0071CE]" />
      </div>
    );
  }

  return (
    <div className="border border-[#E2DFD9] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-[#0D0E12]">Tenant SSO</h3>
          <p className="text-sm text-[#6B6860]">
            Per-tenant SAML/OIDC config. Platform-wide SSO remains the fallback.
          </p>
        </div>
        <Button disabled={saving} onClick={() => void save()} type="button">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save SSO
        </Button>
      </div>
      <div className="space-y-3 text-sm">
        <label className="flex items-center gap-2">
          <input checked={enabled} onChange={(e) => setEnabled(e.target.checked)} type="checkbox" />
          SSO enabled for this tenant
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#6B6860]">Provider</span>
          <select
            className="w-full max-w-xs border border-[#E2DFD9] px-3 py-2"
            onChange={(e) => setProvider(e.target.value as "saml" | "oidc")}
            value={provider}
          >
            <option value="saml">SAML</option>
            <option value="oidc">OIDC</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#6B6860]">SSO email domain</span>
          <input
            className="w-full max-w-md border border-[#E2DFD9] px-3 py-2"
            onChange={(e) => setSsoDomain(e.target.value)}
            placeholder="acme.com"
            value={ssoDomain}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#6B6860]">Provider metadata (JSON)</span>
          <textarea
            className="min-h-[140px] w-full border border-[#E2DFD9] px-3 py-2 font-mono text-xs"
            onChange={(e) => setMetadataJson(e.target.value)}
            value={metadataJson}
          />
        </label>
      </div>
    </div>
  );
}

export function PlatformWebhooksPanel({ tenantId }: { tenantId: string }) {
  const [hooks, setHooks] = useState<
    Array<{ id: string; url: string; events: string[]; enabled: boolean }>
  >([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("tenant.updated, support.created");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/platform/tenants/${tenantId}/webhooks`);
    setLoading(false);
    if (!response.ok) return;
    const body = (await response.json()) as { webhooks: typeof hooks };
    setHooks(body.webhooks ?? []);
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addHook() {
    setSaving(true);
    const response = await fetch(`/api/platform/tenants/${tenantId}/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: JSON.stringify({
        url,
        events: events
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not create webhook.");
      return;
    }
    setUrl("");
    toast.success("Webhook created.");
    void load();
  }

  async function removeHook(id: string) {
    const response = await fetch(
      `/api/platform/tenants/${tenantId}/webhooks?webhookId=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { "x-requested-with": "XMLHttpRequest" },
      },
    );
    if (!response.ok) {
      toast.error("Could not delete webhook.");
      return;
    }
    toast.success("Webhook removed.");
    void load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-[#0071CE]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-[#E2DFD9] bg-white p-5">
        <h3 className="font-display text-base font-bold text-[#0D0E12]">Outbound webhooks</h3>
        <p className="mt-1 text-sm text-[#6B6860]">
          Push tenant events to an external endpoint. Secrets are stored encrypted.
        </p>
        <div className="mt-4 grid gap-3">
          <input
            className="border border-[#E2DFD9] px-3 py-2 text-sm"
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://hooks.example.com/se-enablement"
            value={url}
          />
          <input
            className="border border-[#E2DFD9] px-3 py-2 text-sm"
            onChange={(e) => setEvents(e.target.value)}
            placeholder="events, comma-separated"
            value={events}
          />
          <Button className="w-fit" disabled={saving || !url} onClick={() => void addHook()} type="button">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Add webhook
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {hooks.length === 0 ? (
          <p className="text-sm text-[#A09D98]">No webhooks configured.</p>
        ) : (
          hooks.map((hook) => (
            <div
              className="flex items-center justify-between gap-3 border border-[#E2DFD9] bg-white px-3 py-2 text-sm"
              key={hook.id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[#0D0E12]">{hook.url}</p>
                <p className="text-xs text-[#A09D98]">
                  {hook.enabled ? "enabled" : "disabled"} · {hook.events.join(", ") || "no events"}
                </p>
              </div>
              <Button onClick={() => void removeHook(hook.id)} size="sm" type="button" variant="outline">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
