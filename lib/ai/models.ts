import type { AiProviderName } from "@/lib/ai/provider";

/** Default model per provider. grok-3-mini retired in 2026; grok-4.3 is the same price, so the POC keeps costs flat. */
export const DEFAULT_AI_MODELS: Record<AiProviderName, string> = {
  xai: "grok-4.3",
  openai: "gpt-4.1-mini",
};

/** Models offered in Settings › AI, newest first. */
export const AI_MODEL_OPTIONS: Record<AiProviderName, string[]> = {
  xai: ["grok-4.3", "grok-4.20-0309-non-reasoning", "grok-4.5", "grok-4.7"],
  openai: ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4o"],
};

/** Retired model ids still saved in tenant settings or env; they run on the provider default instead. */
const RETIRED_MODELS: Record<AiProviderName, string[]> = {
  xai: ["grok-3-mini", "grok-3", "grok-2-latest", "grok-2", "grok-beta"],
  openai: [],
};

export function resolveModelName(provider: AiProviderName, model: string | null | undefined): string {
  const name = model?.trim();
  if (!name || RETIRED_MODELS[provider].includes(name)) return DEFAULT_AI_MODELS[provider];
  return name;
}

/**
 * Estimated list price in USD per million tokens. xAI figures come from its language-models API
 * (read as cents per 100M tokens) on 2026-10-06; OpenAI from its published list prices. Used only
 * for the estimates on the usage dashboards. Update when the provider changes pricing.
 */
export const AI_PRICES_PER_MILLION: Record<string, { input: number; output: number }> = {
  "grok-3-mini": { input: 1.25, output: 2.5 },
  "grok-4.3": { input: 1.25, output: 2.5 },
  "grok-4.20-0309-non-reasoning": { input: 1.25, output: 2.5 },
  "grok-4.5": { input: 2, output: 6 },
  "grok-4.7": { input: 2, output: 6 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
};

/** Estimated USD for one call. Unknown models use the current default's price. */
export function estimateAiCostUsd(model: string | null | undefined, promptTokens: number, completionTokens: number): number {
  const price = AI_PRICES_PER_MILLION[model ?? ""] ?? AI_PRICES_PER_MILLION[DEFAULT_AI_MODELS.xai]!;
  return (promptTokens * price.input + completionTokens * price.output) / 1_000_000;
}

export function formatUsd(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return "<$0.01";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: amount < 100 ? 2 : 0 });
}
