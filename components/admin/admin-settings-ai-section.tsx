"use client";

import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AiProviderName } from "@/lib/ai/provider";
import type { PublicAiSettings } from "@/lib/ai/settings-shared";

const MODEL_HINTS: Record<AiProviderName, string[]> = {
  xai: ["grok-3-mini", "grok-2-latest", "grok-beta"],
  openai: ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4o"],
};

export function AdminSettingsAiSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PublicAiSettings | null>(null);
  const [provider, setProvider] = useState<AiProviderName>("xai");
  const [model, setModel] = useState("grok-3-mini");
  const [apiKey, setApiKey] = useState("");

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
    <form className="max-w-3xl space-y-4" onSubmit={handleSave}>
      <div>
        <p className="text-base font-bold text-stone-900">AI provider</p>
        <p className="text-xs text-stone-500">
          Vendor, model, and API key for sims, deal prep, and coaching cards. Keys are encrypted before storage.
          {settings?.source === "env" && !settings.hasApiKey ? " Currently falling back to server env vars." : null}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
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
    </form>
  );
}
