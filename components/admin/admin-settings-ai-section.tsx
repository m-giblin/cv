"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Field, LineCard, LoadingState, SelectInput, TextInput } from "@/components/admin/admin-ui";
import { Tag } from "@/components/ui/tag";
import type { AiProviderName } from "@/lib/ai/provider";
import type { PublicAiSettings } from "@/lib/ai/settings-shared";

const MODEL_HINTS: Record<AiProviderName, string[]> = {
  xai: ["grok-3-mini", "grok-2-latest", "grok-beta"],
  openai: ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4o"],
};

export function AdminSettingsAiSection() {
  const id = useId();
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
      <LineCard title="AI provider">
        <LoadingState label="Loading AI settings…" />
      </LineCard>
    );
  }

  const status = settings?.hasApiKey ? (
    <Tag tone="success">✓ Connected</Tag>
  ) : (
    <Tag tone="warning">▲ No key</Tag>
  );

  return (
    <LineCard actions={status} title="AI provider">
      <form className="flex flex-col gap-4" onSubmit={handleSave}>
        <p className="text-sm text-muted">
          Vendor, model, and API key for sims, deal prep, and coaching cards. Keys are encrypted before storage.
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
              settings?.hasApiKey ? `Saved (${settings.keyPreview ?? "configured"}). Enter to replace` : "Paste API key"
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
            <span className="font-mono text-xs text-ink-2">
              {settings.provider} / {settings.model}
              {settings.keyPreview ? ` · ${settings.keyPreview}` : ""}
            </span>
          ) : (
            <span className="text-[13px] text-warning">No key configured. AI features run in demo mode.</span>
          )}
        </div>
      </form>
    </LineCard>
  );
}
