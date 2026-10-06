"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { PlatformUnsavedBanner } from "@/components/platform/platform-unsaved-banner";
import {
  EmptyLine,
  FIELD_HINT,
  FIELD_LABEL,
  LineCard,
  SELECT,
  Spinner,
  formatDate,
  formatDateTime,
  humanize,
} from "@/components/platform/platform-ui";
import { Toggle } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { Textarea } from "@/components/ui/textarea";
import { isFormDirty } from "@/lib/platform/use-dirty-form";
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
    return <EmptyLine>No admin invites yet.</EmptyLine>;
  }

  return (
    <ul>
      {invites.map((invite) => (
        <li
          className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-b-0"
          key={invite.id}
        >
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-ink">{invite.fullName}</p>
            <p className="text-[13px] text-muted">
              {invite.email}
              {invite.lastSentAt ? `. Sent ${formatDate(invite.lastSentAt)}` : ""}
              {invite.expiresAt ? `, expires ${formatDate(invite.expiresAt)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {invite.status === "pending" ? (
              <StatusPill tone="warning">Pending</StatusPill>
            ) : invite.status === "accepted" ? (
              <StatusPill tone="success">Accepted</StatusPill>
            ) : (
              <StatusPill tone="neutral">{humanize(invite.status)}</StatusPill>
            )}
            {invite.status === "pending" ? (
              <>
                <button
                  className="btn-secondary inline-flex items-center gap-2"
                  disabled={busyId === invite.id}
                  onClick={() => void runAction(invite.id, invite.tenantId, "resend")}
                  type="button"
                >
                  {busyId === invite.id ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
                  Resend
                </button>
                <button
                  className="link text-sm"
                  disabled={busyId === invite.id}
                  onClick={() => void runAction(invite.id, invite.tenantId, "revoke")}
                  type="button"
                >
                  Revoke
                </button>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PlatformCommercialPanel({
  tenant,
  onSaved,
  onDirtyChange,
}: {
  tenant: Tenant;
  onSaved: (tenant: Tenant) => void;
  /** Lets the console demote its header primary while the unsaved bar shows. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const ids = {
    billingStatus: useId(),
    billingPlan: useId(),
    seatQuota: useId(),
    customDomain: useId(),
    customDomainStatus: useId(),
  };
  const snapshotOf = (t: Tenant) => ({
    billingStatus: t.billingStatus,
    billingPlan: t.billingPlan ?? "",
    seatQuota: t.seatQuota?.toString() ?? "",
    customDomain: t.customDomain ?? "",
    customDomainStatus: t.customDomainStatus,
  });

  const [billingStatus, setBillingStatus] = useState<TenantBillingStatus>(tenant.billingStatus);
  const [billingPlan, setBillingPlan] = useState(tenant.billingPlan ?? "");
  const [seatQuota, setSeatQuota] = useState(tenant.seatQuota?.toString() ?? "");
  const [customDomain, setCustomDomain] = useState(tenant.customDomain ?? "");
  const [customDomainStatus, setCustomDomainStatus] = useState<TenantCustomDomainStatus>(
    tenant.customDomainStatus,
  );
  const [saved, setSaved] = useState(snapshotOf(tenant));
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const current = { billingStatus, billingPlan, seatQuota, customDomain, customDomainStatus };
  const dirty = isFormDirty(current, saved);
  const changedCount = (Object.keys(current) as (keyof typeof current)[]).filter(
    (key) => current[key] !== saved[key],
  ).length;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  function discard() {
    setBillingStatus(saved.billingStatus);
    setBillingPlan(saved.billingPlan);
    setSeatQuota(saved.seatQuota);
    setCustomDomain(saved.customDomain);
    setCustomDomainStatus(saved.customDomainStatus);
  }

  useEffect(() => {
    setBillingStatus(tenant.billingStatus);
    setBillingPlan(tenant.billingPlan ?? "");
    setSeatQuota(tenant.seatQuota?.toString() ?? "");
    setCustomDomain(tenant.customDomain ?? "");
    setCustomDomainStatus(tenant.customDomainStatus);
    setSaved(snapshotOf(tenant));
  }, [tenant]);

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/platform/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: JSON.stringify({
        commercial: {
          billingStatus,
          billingPlan: billingPlan || null,
          seatQuota: seatQuota === "" ? null : Number(seatQuota),
          customDomain: customDomain || null,
          customDomainStatus,
        },
      }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not save commercial settings.");
      return;
    }
    const body = (await response.json()) as { tenant: Tenant };
    onSaved(body.tenant);
    setSaved(current);
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

  return (
    <div className="space-y-6">
      <LineCard meta="Billing, plan, seats, domain" title="Commercial">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className={FIELD_LABEL} htmlFor={ids.billingStatus}>
              Billing status
            </label>
            <select
              className={SELECT}
              id={ids.billingStatus}
              onChange={(e) => setBillingStatus(e.target.value as TenantBillingStatus)}
              value={billingStatus}
            >
              {["trial", "active", "past_due", "canceled", "exempt"].map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor={ids.billingPlan}>
              Plan
            </label>
            <Input
              id={ids.billingPlan}
              onChange={(e) => setBillingPlan(e.target.value)}
              placeholder="enterprise, ae-pilot…"
              value={billingPlan}
            />
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor={ids.seatQuota}>
              Seat quota
            </label>
            <Input
              id={ids.seatQuota}
              onChange={(e) => setSeatQuota(e.target.value)}
              placeholder="Unlimited"
              type="number"
              value={seatQuota}
            />
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor={ids.customDomain}>
              Custom domain
            </label>
            <Input
              id={ids.customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="enablement.acme.com"
              value={customDomain}
            />
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor={ids.customDomainStatus}>
              Domain status
            </label>
            <select
              className={SELECT}
              id={ids.customDomainStatus}
              onChange={(e) => setCustomDomainStatus(e.target.value as TenantCustomDomainStatus)}
              value={customDomainStatus}
            >
              {["none", "pending", "verified", "failed"].map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </LineCard>

      <LineCard title="Data export">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-[13px] text-muted">
              Export status: {humanize(String(tenant.exportStatus))}
              {tenant.exportCompletedAt ? `, ${formatDateTime(tenant.exportCompletedAt)}` : ""}
            </p>
            <p className="mt-1 text-sm text-ink-2">Offboarding lives in the tenant header, next to Suspend.</p>
          </div>
          <button
            className="btn-secondary inline-flex items-center gap-2"
            disabled={exporting}
            onClick={() => void runExport()}
            type="button"
          >
            {exporting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            Export tenant JSON
          </button>
        </div>
      </LineCard>

      <PlatformUnsavedBanner
        count={changedCount}
        onDiscard={discard}
        onSave={() => void save()}
        saving={saving}
        show={dirty}
        summary="Commercial settings"
      />
    </div>
  );
}

export function PlatformSsoPanel({
  tenantId,
  onDirtyChange,
}: {
  tenantId: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const providerId = useId();
  const domainId = useId();
  const metadataId = useId();
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState<"saml" | "oidc">("saml");
  const [ssoDomain, setSsoDomain] = useState("");
  const [metadataJson, setMetadataJson] = useState("{}");
  const [saved, setSaved] = useState({ enabled: false, provider: "saml" as "saml" | "oidc", ssoDomain: "", metadataJson: "{}" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const current = { enabled, provider, ssoDomain, metadataJson };
  const dirty = isFormDirty(current, saved);
  const changedCount = (Object.keys(current) as (keyof typeof current)[]).filter(
    (key) => current[key] !== saved[key],
  ).length;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  function discard() {
    setEnabled(saved.enabled);
    setProvider(saved.provider);
    setSsoDomain(saved.ssoDomain);
    setMetadataJson(saved.metadataJson);
  }

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
      const loaded = {
        enabled: body.config.enabled,
        provider: body.config.provider,
        ssoDomain: body.config.ssoDomain ?? "",
        metadataJson: JSON.stringify(body.config.metadata ?? {}, null, 2),
      };
      setEnabled(loaded.enabled);
      setProvider(loaded.provider);
      setSsoDomain(loaded.ssoDomain);
      setMetadataJson(loaded.metadataJson);
      setSaved(loaded);
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
    setSaved(current);
  }

  if (loading) return <Spinner label="Loading SSO config" />;

  return (
    <div>
      <LineCard meta="Platform SSO stays the fallback" title="Tenant SSO">
        <div className="space-y-4 p-5">
          <div className={`flex items-center justify-between gap-4 rounded-[10px] px-4 py-3 ${enabled !== saved.enabled ? "bg-signal-soft" : "bg-bg"}`}>
            <div>
              <p className="text-[15px] font-bold text-ink">SSO for this tenant</p>
              <p className="text-sm text-muted">{enabled ? "On: users sign in through the provider below." : "Off: users sign in with password and MFA."}</p>
            </div>
            <Toggle changed={enabled !== saved.enabled} checked={enabled} label="SSO enabled for this tenant" onChange={setEnabled} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={FIELD_LABEL} htmlFor={providerId}>
                Provider
              </label>
              <select
                className={SELECT}
                id={providerId}
                onChange={(e) => setProvider(e.target.value as "saml" | "oidc")}
                value={provider}
              >
                <option value="saml">SAML</option>
                <option value="oidc">OIDC</option>
              </select>
            </div>
            <div>
              <label className={FIELD_LABEL} htmlFor={domainId}>
                SSO email domain
              </label>
              <Input id={domainId} onChange={(e) => setSsoDomain(e.target.value)} placeholder="acme.com" value={ssoDomain} />
            </div>
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor={metadataId}>
              Provider metadata (JSON)
            </label>
            <Textarea
              className="min-h-[160px] text-[13px]"
              id={metadataId}
              onChange={(e) => setMetadataJson(e.target.value)}
              value={metadataJson}
            />
            <p className={FIELD_HINT}>Must be valid JSON. Checked when you save.</p>
          </div>
        </div>
      </LineCard>

      <PlatformUnsavedBanner
        count={changedCount}
        onDiscard={discard}
        onSave={() => void save()}
        saveLabel="Save SSO"
        saving={saving}
        show={dirty}
        summary="Tenant SSO"
      />
    </div>
  );
}

export function PlatformWebhooksPanel({ tenantId }: { tenantId: string }) {
  const urlId = useId();
  const eventsId = useId();
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

  if (loading) return <Spinner label="Loading webhooks" />;

  return (
    <div className="space-y-6">
      <LineCard meta="Secrets are stored encrypted" title="Add a webhook">
        <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label className={FIELD_LABEL} htmlFor={urlId}>
              Endpoint URL
            </label>
            <Input
              id={urlId}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.example.com/se-enablement"
              type="url"
              value={url}
            />
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor={eventsId}>
              Events <span className="font-normal text-muted">(comma-separated)</span>
            </label>
            <Input id={eventsId} onChange={(e) => setEvents(e.target.value)} value={events} />
          </div>
          <button
            className="btn-secondary inline-flex h-10 items-center gap-2"
            disabled={saving || !url}
            onClick={() => void addHook()}
            type="button"
          >
            {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            Add webhook
          </button>
        </div>
      </LineCard>

      <LineCard meta={`${hooks.length} configured`} title="Outbound webhooks">
        {hooks.length === 0 ? (
          <EmptyLine>No webhooks configured.</EmptyLine>
        ) : (
          <ul>
            {hooks.map((hook) => (
              <li
                className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-b-0"
                key={hook.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-ink">{hook.url}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {hook.enabled ? <StatusPill tone="success">Enabled</StatusPill> : <StatusPill tone="neutral">Disabled</StatusPill>}
                    <span className="text-[13px] text-muted">{hook.events.join(", ") || "No events"}</span>
                  </div>
                </div>
                <button className="link text-sm" onClick={() => void removeHook(hook.id)} type="button">
                  Remove<span className="sr-only"> webhook {hook.url}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </LineCard>
    </div>
  );
}
