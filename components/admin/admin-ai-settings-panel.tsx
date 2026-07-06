"use client";

import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Toggle as AdminToggle } from "@/components/admin/admin-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AiProviderName } from "@/lib/ai/provider";
import type { PublicAiSettings } from "@/lib/ai/settings-shared";

const MODEL_HINTS: Record<AiProviderName, string[]> = {
  xai: ["grok-3-mini", "grok-2-latest", "grok-beta"],
  openai: ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4o"],
};

type AdminToggleRow = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

const DEFAULT_FEATURE_FLAGS: AdminToggleRow[] = [
  {
    id: "northstar-admin-ui",
    label: "Northstar Admin UI",
    description: "Enable new admin visual experience for all admin users.",
    enabled: true,
  },
  {
    id: "agentic-ai-track",
    label: "Agentic AI Track",
    description: "Expose Agentic AI onboarding track in plan templates and analytics.",
    enabled: false,
  },
  {
    id: "pitch-studio",
    label: "Pitch Studio",
    description: "Enable Pitch Studio practice mode in simulation workflows.",
    enabled: true,
  },
  {
    id: "isc-lab",
    label: "ISC Lab",
    description: "Enable ISC Lab scenarios and competency-linked assessments.",
    enabled: true,
  },
];

const DEFAULT_INTEGRATIONS = [
  {
    id: "slack",
    name: "Slack workspace",
    statusText: "Q&A routing and SME escalations",
    stat: "Active",
    statBg: "#dcfce7",
    statColor: "#15803d",
    iconBg: "#e8f2fc",
    iconColor: "#0071ce",
  },
  {
    id: "supabase",
    name: "Supabase",
    statusText: "Auth, profiles, and encrypted AI keys",
    stat: "Active",
    statBg: "#dcfce7",
    statColor: "#15803d",
    iconBg: "#dcfce7",
    iconColor: "#15803d",
  },
  {
    id: "xai",
    name: "xAI / OpenAI",
    statusText: "Provider configured in AI settings above",
    stat: "Limited",
    statBg: "#fef3c7",
    statColor: "#b45309",
    iconBg: "#ede9fe",
    iconColor: "#5b21b6",
  },
  {
    id: "vercel",
    name: "Vercel",
    statusText: "Hosting and deployment pipeline",
    stat: "Active",
    statBg: "#dcfce7",
    statColor: "#15803d",
    iconBg: "#f1f5f9",
    iconColor: "#64748b",
  },
] as const;

export function AdminAiSettingsPanel({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PublicAiSettings | null>(null);
  const [provider, setProvider] = useState<AiProviderName>("xai");
  const [model, setModel] = useState("grok-3-mini");
  const [apiKey, setApiKey] = useState("");
  const [featureFlags, setFeatureFlags] = useState(DEFAULT_FEATURE_FLAGS);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/ai-settings");
    setLoading(false);

    if (!response.ok) {
      toast.error("Could not load AI settings.");
      return;
    }

    const body = (await response.json()) as { settings: PublicAiSettings };
    setSettings(body.settings);
    setProvider(body.settings.provider);
    setModel(body.settings.model);
    setApiKey("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const response = await fetch("/api/admin/ai-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        model,
        apiKey: apiKey.trim() || undefined,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      toast.error(body.error ?? "Could not save AI settings.");
      return;
    }

    toast.success("AI settings saved. New requests will use this provider.");
    setApiKey("");
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
    <form className="space-y-4" onSubmit={handleSave}>
      <div>
        <p className={`font-bold text-stone-900 ${compact ? "text-sm" : "text-base"}`}>AI provider</p>
        <p className="text-xs text-stone-500">
          Vendor, model, and API key for sims, deal prep, and coaching cards. Keys are encrypted before storage.
          {settings?.source === "env" && !settings.hasApiKey ? " Currently falling back to server env vars." : null}
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold text-stone-700">Vendor</span>
          <select
            className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3"
            onChange={(event) => setProvider(event.target.value as AiProviderName)}
            value={provider}
          >
            <option value="xai">xAI (Grok)</option>
            <option value="openai">OpenAI</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm sm:col-span-2">
          <span className="font-semibold text-stone-700">Model</span>
          <Input
            list={`ai-models-${provider}`}
            onChange={(event) => setModel(event.target.value)}
            placeholder={MODEL_HINTS[provider][0]}
            value={model}
          />
          <datalist id={`ai-models-${provider}`}>
            {MODEL_HINTS[provider].map((hint) => (
              <option key={hint} value={hint} />
            ))}
          </datalist>
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-semibold text-stone-700">API key</span>
        <Input
          autoComplete="off"
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={settings?.hasApiKey ? `Saved (${settings.keyPreview ?? "configured"}) — enter to replace` : "Paste API key"}
          type="password"
          value={apiKey}
        />
        <p className="text-[10px] text-stone-500">
          Encrypted in Supabase (AES-256-GCM). The decryption key lives only in server env — not in the database.
        </p>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={saving} type="submit">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save AI settings
        </Button>
        {settings?.hasApiKey ? (
          <span className="text-xs text-emerald-700">
            Connected · {settings.provider} / {settings.model}
            {settings.keyPreview ? ` · ${settings.keyPreview}` : ""}
          </span>
        ) : (
          <span className="text-xs text-amber-700">No key configured — AI features run in demo mode.</span>
        )}
      </div>

      <div className="rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px]">
        <p className="mb-[10px] text-[12.5px] font-bold text-[#0a1628]">Feature flags</p>
        <div className="space-y-[12px]">
          {featureFlags.map((flag) => (
            <div className="flex items-start justify-between gap-[12px] border-b border-[#f1f5f9] py-[10px]" key={flag.id}>
              <div>
                <p className="mb-[2px] text-[12px] font-semibold text-[#1e293b]">{flag.label}</p>
                <p className="text-[10.5px] leading-[1.5] text-[#94a3b8]">{flag.description}</p>
              </div>
              <AdminToggle
                checked={flag.enabled}
                className="mt-[2px] flex-shrink-0"
                onChange={(enabled) =>
                  setFeatureFlags((current) => current.map((row) => (row.id === flag.id ? { ...row, enabled } : row)))
                }
              />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px]">
        <p className="mb-[10px] text-[12.5px] font-bold text-[#0a1628]">Integrations</p>
        <div className="space-y-[10px]">
          {DEFAULT_INTEGRATIONS.map((integration) => (
            <div
              className="flex items-center gap-[12px] rounded-[9px] border border-[#e2eaf5] bg-[#f8fafd] px-[12px] py-[10px]"
              key={integration.id}
            >
              <div
                className="flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center rounded-lg"
                style={{ background: integration.iconBg }}
              >
                <svg fill="none" height="15" stroke={integration.iconColor} strokeLinecap="round" strokeWidth="1.5" viewBox="0 0 16 16" width="15">
                  <rect height="10" rx="2" width="10" x="3" y="3" />
                  <path d="M6 8h4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-[#1e293b]">{integration.name}</p>
                <p className="text-[10.5px] text-[#94a3b8]">{integration.statusText}</p>
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
    </form>
  );
}
