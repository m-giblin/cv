import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";
import { loadPlatformAiSettings } from "@/lib/ai/settings";

export type AiProviderName = "xai" | "openai";

function buildFromCredentials(
  provider: AiProviderName,
  modelName: string,
  apiKey: string,
): { provider: AiProviderName; model: LanguageModel; modelName: string } {
  if (provider === "openai") {
    const client = createOpenAI({ apiKey });
    return { provider, model: client(modelName), modelName };
  }

  const client = createXai({ apiKey });
  return { provider, model: client(modelName), modelName };
}

/** @deprecated use resolveAiProvider */
export function getConfiguredProvider(): {
  provider: AiProviderName;
  model: LanguageModel | null;
  modelName: string;
} {
  const configuredProvider = (process.env.AI_PROVIDER ?? "xai").toLowerCase();

  if (configuredProvider === "openai" && process.env.OPENAI_API_KEY) {
    const modelName = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
    return buildFromCredentials("openai", modelName, process.env.OPENAI_API_KEY);
  }

  if (process.env.XAI_API_KEY) {
    const modelName = process.env.XAI_MODEL ?? "grok-3-mini";
    return buildFromCredentials("xai", modelName, process.env.XAI_API_KEY);
  }

  return {
    provider: configuredProvider === "openai" ? "openai" : "xai",
    model: null,
    modelName: "demo-structured-output",
  };
}

export async function resolveAiProvider(): Promise<{
  provider: AiProviderName;
  model: LanguageModel | null;
  modelName: string;
}> {
  const settings = await loadPlatformAiSettings();

  if (settings.apiKey) {
    return buildFromCredentials(settings.provider, settings.model, settings.apiKey);
  }

  return {
    provider: settings.provider,
    model: null,
    modelName: settings.model,
  };
}
