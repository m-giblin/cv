import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { openApiKey, sealApiKey } from "@/lib/crypto/api-key-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiProviderName } from "@/lib/ai/provider";
import type { AiUsageSummary, PublicAiSettings } from "@/lib/ai/settings-shared";

export type { AiUsageSummary, PublicAiSettings } from "@/lib/ai/settings-shared";
export { formatTokenCount } from "@/lib/ai/settings-shared";

export type PlatformAiSettings = {
  provider: AiProviderName;
  model: string;
  apiKey: string | null;
  updatedAt: string | null;
  source: "database" | "env";
};

const FEATURE_LABELS: Record<string, string> = {
  simulation_turn: "Sim roleplay turns",
  coaching_card: "Coaching cards",
  deal_prep: "Deal prep briefs",
  challenge: "Challenge generation",
  isc_lab: "ISC Lab",
};

function envFallback(): PlatformAiSettings {
  const provider = ((process.env.AI_PROVIDER ?? "xai").toLowerCase() === "openai" ? "openai" : "xai") as AiProviderName;
  const apiKey =
    provider === "openai" ? process.env.OPENAI_API_KEY ?? null : process.env.XAI_API_KEY ?? process.env.OPENAI_API_KEY ?? null;
  const model =
    provider === "openai"
      ? process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
      : process.env.XAI_MODEL ?? "grok-3-mini";

  return {
    provider,
    model,
    apiKey,
    updatedAt: null,
    source: "env",
  };
}

export function maskApiKey(key: string | null | undefined): string | null {
  if (!key || key.length < 8) return null;
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export async function loadPlatformAiSettings(): Promise<PlatformAiSettings> {
  const admin = createAdminClient();
  if (!admin) {
    return envFallback();
  }

  const { data, error } = await admin
    .from("platform_settings")
    .select("provider, model, api_key_ciphertext, updated_at")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return envFallback();
  }

  const provider = (data.provider === "openai" ? "openai" : "xai") as AiProviderName;
  let dbKey: string | null = null;

  try {
    dbKey = openApiKey(data.api_key_ciphertext);
  } catch (error) {
    console.error("Could not decrypt platform AI API key:", error instanceof Error ? error.message : error);
  }

  if (dbKey) {
    return {
      provider,
      model: data.model,
      apiKey: dbKey,
      updatedAt: data.updated_at,
      source: "database",
    };
  }

  const env = envFallback();
  return {
    provider: data.model ? provider : env.provider,
    model: data.model || env.model,
    apiKey: env.apiKey,
    updatedAt: data.updated_at,
    source: env.apiKey ? "env" : "database",
  };
}

export function toPublicAiSettings(settings: PlatformAiSettings, dbHasKey: boolean): PublicAiSettings {
  return {
    provider: settings.provider,
    model: settings.model,
    hasApiKey: Boolean(settings.apiKey),
    keyPreview: maskApiKey(settings.apiKey),
    source: dbHasKey ? "database" : settings.source,
    updatedAt: settings.updatedAt,
  };
}

export async function savePlatformAiSettings(
  admin: SupabaseClient,
  userId: string,
  input: { provider: AiProviderName; model: string; apiKey?: string | null },
): Promise<void> {
  const payload: {
    provider: string;
    model: string;
    updated_at: string;
    updated_by: string;
    api_key_ciphertext?: string;
  } = {
    provider: input.provider,
    model: input.model.trim(),
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };

  if (typeof input.apiKey === "string" && input.apiKey.trim().length > 0) {
    payload.api_key_ciphertext = sealApiKey(input.apiKey);
  }

  const { error } = await admin.from("platform_settings").upsert({ id: "default", ...payload });

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadAiUsageSummary(admin: SupabaseClient): Promise<AiUsageSummary> {
  const settings = await loadPlatformAiSettings();
  const now = new Date();
  const start30d = new Date(now);
  start30d.setDate(start30d.getDate() - 30);
  const startToday = new Date(now.toISOString().slice(0, 10));

  const { data: rows } = await admin
    .from("ai_usage_logs")
    .select("feature, total_tokens, created_at")
    .gte("created_at", start30d.toISOString())
    .order("created_at", { ascending: false });

  const logs = rows ?? [];
  const todayLogs = logs.filter((row) => new Date(row.created_at) >= startToday);

  const byFeatureMap = new Map<string, { count: number; tokens: number }>();
  for (const row of logs) {
    const current = byFeatureMap.get(row.feature) ?? { count: 0, tokens: 0 };
    current.count += 1;
    current.tokens += row.total_tokens ?? 0;
    byFeatureMap.set(row.feature, current);
  }

  const byFeature = [...byFeatureMap.entries()]
    .map(([feature, stats]) => ({
      feature,
      label: FEATURE_LABELS[feature] ?? feature,
      count: stats.count,
      tokens: stats.tokens,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    requests30d: logs.length,
    requestsToday: todayLogs.length,
    tokens30d: logs.reduce((sum, row) => sum + (row.total_tokens ?? 0), 0),
    tokensToday: todayLogs.reduce((sum, row) => sum + (row.total_tokens ?? 0), 0),
    model: settings.model,
    provider: settings.provider,
    byFeature,
  };
}
