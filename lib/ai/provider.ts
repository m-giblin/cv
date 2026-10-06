import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_AI_MODELS, resolveModelName } from "@/lib/ai/models";
import { createXai } from "@ai-sdk/xai";
import type { LanguageModel, ToolSet } from "ai";
import { SAILPOINT_DOC_DOMAINS } from "@/lib/help/sailpoint-docs";
import { loadPlatformAiSettings } from "@/lib/ai/settings";

export type AiProviderName = "xai" | "openai";

/** A model plus a web search tool locked to SailPoint's public docs (Bosun's live sources). */
export type DocsSearch = { model: LanguageModel; tools: ToolSet };

function buildFromCredentials(
  provider: AiProviderName,
  modelName: string,
  apiKey: string,
): { provider: AiProviderName; model: LanguageModel; modelName: string; docsSearch: DocsSearch } {
  // Saved settings may still name a retired model; run it on the current default.
  modelName = resolveModelName(provider, modelName);
  if (provider === "openai") {
    const client = createOpenAI({ apiKey });
    const docsSearch = {
      model: client.responses(modelName),
      tools: { web_search: client.tools.webSearch({ filters: { allowedDomains: [...SAILPOINT_DOC_DOMAINS] } }) },
    };
    return { provider, model: client(modelName), modelName, docsSearch };
  }

  const client = createXai({ apiKey });
  const docsSearch = {
    model: client.responses(modelName),
    tools: { web_search: client.tools.webSearch({ allowedDomains: [...SAILPOINT_DOC_DOMAINS] }) },
  };
  return { provider, model: client(modelName), modelName, docsSearch };
}

/** @deprecated use resolveAiProvider */
export function getConfiguredProvider(): {
  provider: AiProviderName;
  model: LanguageModel | null;
  modelName: string;
} {
  const configuredProvider = (process.env.AI_PROVIDER ?? "xai").toLowerCase();

  if (configuredProvider === "openai" && process.env.OPENAI_API_KEY) {
    const modelName = process.env.OPENAI_MODEL || DEFAULT_AI_MODELS.openai;
    return buildFromCredentials("openai", modelName, process.env.OPENAI_API_KEY);
  }

  if (process.env.XAI_API_KEY) {
    const modelName = process.env.XAI_MODEL || DEFAULT_AI_MODELS.xai;
    return buildFromCredentials("xai", modelName, process.env.XAI_API_KEY);
  }

  return {
    provider: configuredProvider === "openai" ? "openai" : "xai",
    model: null,
    modelName: "demo-structured-output",
  };
}

export async function resolveAiProvider(tenantId?: string): Promise<{
  provider: AiProviderName;
  model: LanguageModel | null;
  modelName: string;
  docsSearch?: DocsSearch;
}> {
  const settings = await loadPlatformAiSettings(tenantId);

  if (settings.apiKey) {
    return buildFromCredentials(settings.provider, settings.model, settings.apiKey);
  }

  return {
    provider: settings.provider,
    model: null,
    modelName: settings.model,
  };
}
