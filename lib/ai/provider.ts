import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";

export type AiProviderName = "xai" | "openai";

export function getConfiguredProvider(): {
  provider: AiProviderName;
  model: LanguageModel | null;
  modelName: string;
} {
  const configuredProvider = (process.env.AI_PROVIDER ?? "xai").toLowerCase();

  if (configuredProvider === "openai" && process.env.OPENAI_API_KEY) {
    const modelName = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
    return {
      provider: "openai",
      model: openai(modelName),
      modelName,
    };
  }

  if (process.env.XAI_API_KEY) {
    const modelName = process.env.XAI_MODEL ?? "grok-3-mini";
    return {
      provider: "xai",
      model: xai(modelName),
      modelName,
    };
  }

  return {
    provider: configuredProvider === "openai" ? "openai" : "xai",
    model: null,
    modelName: "demo-structured-output",
  };
}
