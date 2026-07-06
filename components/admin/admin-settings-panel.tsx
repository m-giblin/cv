"use client";

import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Toggle as AdminToggle } from "@/components/admin/admin-toggle";
import { GongConnectPanel } from "@/components/integrations/gong-connect-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_ACTIVITY_LOG_RETENTION_DAYS,
  DEFAULT_AI_USAGE_RETENTION_DAYS,
  DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  DEFAULT_SESSION_IDLE_MINUTES,
  MAX_RETENTION_DAYS,
  MAX_SESSION_IDLE_MINUTES,
  MIN_RETENTION_DAYS,
  MIN_SESSION_IDLE_MINUTES,
  PLATFORM_FEATURE_FLAG_DEFS,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

const SETTINGS_CARD =
  "rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px] shadow-[0_1px_4px_rgba(0,20,58,0.04)]";

type PlatformSettingsState = {
  sessionIdleMinutes: number;
  featureFlags: PlatformFeatureFlags;
  auditLogRetentionDays: number;
  activityLogRetentionDays: number;
  aiUsageRetentionDays: number;
};

const STATIC_INTEGRATIONS = [
  { name: "Supabase", status: "Auth, profiles, encrypted settings", stat: "Active", statBg: "#dcfce7", statColor: "#15803d", iconBg: "#dcfce7", iconColor: "#15803d" },
  { name: "Vercel", status: "Hosting and deployment pipeline", stat: "Active", statBg: "#dcfce7", statColor: "#15803d", iconBg: "#f1f5f9", iconColor: "#64748b" },
] as const;

export function AdminSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettingsState>({
    sessionIdleMinutes: DEFAULT_SESSION_IDLE_MINUTES,
    featureFlags: {},
    auditLogRetentionDays: DEFAULT_AUDIT_LOG_RETENTION_DAYS,
    activityLogRetentionDays: DEFAULT_ACTIVITY_LOG_RETENTION_DAYS,
    aiUsageRetentionDays: DEFAULT_AI_USAGE_RETENTION_DAYS,
  });
  const [gongConnected, setGongConnected] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [settingsRes, integrationsRes] = await Promise.all([
      fetch("/api/admin/platform-settings"),
      fetch("/api/integrations/status"),
    ]);
    setLoading(false);

    if (settingsRes.ok) {
      const body = (await settingsRes.json()) as { settings: PlatformSettingsState };
      setSettings(body.settings);
    } else {
      toast.error("Could not load platform settings.");
    }

    if (integrationsRes.ok) {
      const body = (await integrationsRes.json()) as { configured?: { gong?: boolean; slack?: boolean } };
      setGongConnected(Boolean(body.configured?.gong));
      setSlackConnected(Boolean(body.configured?.slack));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    const response = await fetch("/api/admin/platform-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      toast.error(body.error ?? "Could not save platform settings.");
      return;
    }

    toast.success("Platform settings saved.");
    void load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#0033a1]" />
      </div>
    );
  }

  const integrationRows = [
    {
      name: "Gong",
      status: "Pre-call intel and call briefs in Deal Prep",
      stat: gongConnected ? "Connected" : "Not connected",
      statBg: gongConnected ? "#dcfce7" : "#fef3c7",
      statColor: gongConnected ? "#15803d" : "#b45309",
      iconBg: "#e8f2fc",
      iconColor: "#0071ce",
    },
    {
      name: "Slack",
      status: "Q&A routing and SME escalations",
      stat: slackConnected ? "Connected" : "Configure token",
      statBg: slackConnected ? "#dcfce7" : "#fef3c7",
      statColor: slackConnected ? "#15803d" : "#b45309",
      iconBg: "#e8f2fc",
      iconColor: "#0071ce",
    },
    ...STATIC_INTEGRATIONS,
  ];

  return (
    <div className="anim-in space-y-[14px]">
      <div className="mb-[4px]">
        <h1 className="font-display text-[20px] font-extrabold text-[#0a1628]">Platform Settings</h1>
        <p className="mt-[2px] text-[12px] text-[#64748b]">
          Feature flags, integrations, session policy, and data retention
        </p>
      </div>

      <div className="grid gap-[14px] lg:grid-cols-2">
        <div className={SETTINGS_CARD}>
          <p className="mb-[14px] text-[12.5px] font-bold text-[#0a1628]">Feature flags</p>
          <div className="flex flex-col gap-[12px]">
            {PLATFORM_FEATURE_FLAG_DEFS.map((flag) => (
              <div
                className="flex items-start justify-between gap-[12px] border-b border-[#f1f5f9] py-[10px] last:border-0"
                key={flag.id}
              >
                <div>
                  <p className="mb-[2px] text-[12px] font-semibold text-[#1e293b]">{flag.label}</p>
                  <p className="text-[10.5px] leading-[1.5] text-[#94a3b8]">{flag.description}</p>
                </div>
                <AdminToggle
                  checked={settings.featureFlags[flag.id] ?? flag.defaultEnabled}
                  className="mt-[2px] shrink-0"
                  onChange={(enabled) =>
                    setSettings((current) => ({
                      ...current,
                      featureFlags: { ...current.featureFlags, [flag.id]: enabled },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className={SETTINGS_CARD}>
          <p className="mb-[14px] text-[12.5px] font-bold text-[#0a1628]">Integrations</p>
          <GongConnectPanel />
          <div className="mt-[10px] flex flex-col gap-[10px]">
            {integrationRows.map((integration) => (
              <div
                className="flex items-center gap-[12px] rounded-[9px] border border-[#e2eaf5] bg-[#f8fafd] px-[12px] py-[10px]"
                key={integration.name}
              >
                <div
                  className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg"
                  style={{ background: integration.iconBg }}
                >
                  <svg fill="none" height="15" stroke={integration.iconColor} strokeLinecap="round" strokeWidth="1.5" viewBox="0 0 16 16" width="15">
                    <rect height="10" rx="2" width="10" x="3" y="3" />
                    <path d="M6 8h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-[#1e293b]">{integration.name}</p>
                  <p className="text-[10.5px] text-[#94a3b8]">{integration.status}</p>
                </div>
                <span
                  className="rounded-full px-[8px] py-[2px] text-[9.5px] font-bold"
                  style={{ background: integration.statBg, color: integration.statColor }}
                >
                  {integration.stat}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-[14px] lg:grid-cols-2">
        <div className={SETTINGS_CARD}>
          <p className="mb-[14px] text-[12.5px] font-bold text-[#0a1628]">Basic</p>
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-[#1e293b]">Session idle timeout (minutes)</span>
            <p className="text-[10.5px] leading-relaxed text-[#94a3b8]">
              Sign out after inactivity. Default 15 minutes; increase for UAT (max {MAX_SESSION_IDLE_MINUTES}).
            </p>
            <Input
              max={MAX_SESSION_IDLE_MINUTES}
              min={MIN_SESSION_IDLE_MINUTES}
              onChange={(event) =>
                setSettings((current) => ({ ...current, sessionIdleMinutes: Number(event.target.value) }))
              }
              type="number"
              value={settings.sessionIdleMinutes}
            />
          </label>
        </div>

        <div className={SETTINGS_CARD}>
          <p className="mb-[14px] text-[12.5px] font-bold text-[#0a1628]">Data retention</p>
          <p className="mb-[12px] text-[10.5px] leading-relaxed text-[#94a3b8]">
            Target retention windows for compliance and storage. Purge jobs use these values; audit log panel shows
            immutable admin actions regardless of source table.
          </p>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="font-semibold text-[#1e293b]">Audit log retention (days)</span>
              <Input
                max={MAX_RETENTION_DAYS}
                min={MIN_RETENTION_DAYS}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, auditLogRetentionDays: Number(event.target.value) }))
                }
                type="number"
                value={settings.auditLogRetentionDays}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-semibold text-[#1e293b]">Activity feed retention (days)</span>
              <Input
                max={MAX_RETENTION_DAYS}
                min={MIN_RETENTION_DAYS}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, activityLogRetentionDays: Number(event.target.value) }))
                }
                type="number"
                value={settings.activityLogRetentionDays}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-semibold text-[#1e293b]">AI usage log retention (days)</span>
              <Input
                max={MAX_RETENTION_DAYS}
                min={MIN_RETENTION_DAYS}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, aiUsageRetentionDays: Number(event.target.value) }))
                }
                type="number"
                value={settings.aiUsageRetentionDays}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={saving} onClick={() => void handleSave()} type="button">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save platform settings
        </Button>
        <p className="text-[10.5px] text-[#94a3b8]">
          Changes apply on next page load for session timeout. All admin mutations are written to the audit log.
        </p>
      </div>
    </div>
  );
}
