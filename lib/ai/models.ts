import type { AiProviderName } from "@/lib/ai/provider";

/** Default model per provider. grok-3-mini retired in 2026; grok-4.5 is xAI's current general model. */
export const DEFAULT_AI_MODELS: Record<AiProviderName, string> = {
  xai: "grok-4.5",
  openai: "gpt-4.1-mini",
};

/** Models offered in Settings › AI, newest first. */
export const AI_MODEL_OPTIONS: Record<AiProviderName, string[]> = {
  xai: ["grok-4.5", "grok-4.7", "grok-4.3", "grok-4.20-0309-non-reasoning"],
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
