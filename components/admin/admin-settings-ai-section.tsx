"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODELS } from "@/lib/ai/models";
import { toast } from "sonner";
import { Field, LineCard, LoadingState, SelectInput, TextInput } from "@/components/admin/admin-ui";
import { GlobalAiSettingsToggles } from "@/components/admin/global-ai-settings-toggles";
import { Stat, StatStrip } from "@/components/ui/stat";
import { StatusPill } from "@/components/ui/status-pill";
import type { AiProviderName } from "@/lib/ai/provider";
import { formatTokenCount, type AiUsageSummary, type PublicAiSettings } from "@/lib/ai/settings-shared";

const MODEL_HINTS: Record<AiProviderName, string[]> = AI_MODEL_OPTIONS;

/** Settings › AI: usage over 30 days, the provider form, and the global AI switches (moved here from Content). */
export function AdminSettingsAiSection({ usage = null }: { usage?: AiUsageSummary | null }) {
  return (
    <>
      {usage ? (
        <StatStrip>
          <Stat label="Requests, 30 days" value={usage.requests30d.toLocaleString("en-US")} />
          <Stat label="Requests today" value={usage.requestsToday.toLocaleString("en-US")} />
          <Stat label="Tokens, 30 days" value={formatTokenCount(usage.tokens30d)} />
          <Stat
            label="Busiest feature"
            note={usage.byFeature[0] ? `${usage.byFeature[0].count.toLocaleString("en-US")} requests` : undefined}
            tone="ink"
            value={<span className="text-2xl">{usage.byFeature[0]?.label ?? "None yet"}</span>}
          />
        </StatStrip>
      ) : null}
      <AiProviderForm />
      <GlobalAiSettingsToggles />
    </>
  );
}

function AiProviderForm() {
  const id = useId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PublicAiSettings | null>(null);
  const [provider, setProvider] = useState<AiProviderName>("xai");
  const [model, setModel] = useState(DEFAULT_AI_MODELS.xai);
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
      <LineCard title="AI provider">
        <LoadingState label="Loading AI settings…" />
      </LineCard>
    );
  }

  const status = settings?.hasApiKey ? (
    <StatusPill tone="success">Connected</StatusPill>
  ) : (
    <StatusPill tone="warning">No key</StatusPill>
  );

  return (
    <LineCard actions={status} title="AI provider">
      <form className="flex flex-col gap-4" onSubmit={handleSave}>
        <p className="text-sm text-ink-2">
          Vendor, model and API key for simulations, deal prep and coaching cards. Keys are encrypted before storage.
          {settings?.source === "env" && !settings.hasApiKey ? " Currently falling back to server env vars." : null}
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field htmlFor={`${id}-vendor`} label="Vendor">
            <SelectInput
              id={`${id}-vendor`}
              onChange={(event) => setProvider(event.target.value as AiProviderName)}
              value={provider}
            >
              <option value="xai">xAI (Grok)</option>
              <option value="openai">OpenAI</option>
            </SelectInput>
          </Field>

          <Field className="sm:col-span-2" htmlFor={`${id}-model`} label="Model">
            <TextInput
              id={`${id}-model`}
              list={`${id}-models-${provider}`}
              onChange={(event) => setModel(event.target.value)}
              placeholder={MODEL_HINTS[provider][0]}
              value={model}
            />
            <datalist id={`${id}-models-${provider}`}>
              {MODEL_HINTS[provider].map((hint) => (
                <option key={hint} value={hint} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field
          hint="Encrypted at rest (AES-256-GCM). The decryption key lives only in server env, not in the database."
          htmlFor={`${id}-key`}
          label="API key"
        >
          <TextInput
            autoComplete="off"
            id={`${id}-key`}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={
              settings?.hasApiKey ? `Saved (${settings.keyPreview ?? "configured"}). Type a new key to replace it` : "Paste an API key"
            }
            type="password"
            value={apiKey}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-4 border-t border-divider pt-4">
          <button className="btn-primary" disabled={saving} type="submit">
            {saving ? "Saving…" : "Save AI settings"}
          </button>
          {settings?.hasApiKey ? (
            <span className="text-sm text-ink-2">
              Using {settings.provider === "openai" ? "OpenAI" : "xAI"} {settings.model}
              {settings.keyPreview ? `, key ending ${settings.keyPreview.slice(-4)}` : ""}.
            </span>
          ) : (
            <span className="text-[13px] text-warning">No key configured. AI features run in demo mode.</span>
          )}
        </div>
      </form>
    </LineCard>
  );
}
