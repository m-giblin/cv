import type { AiProviderName } from "@/lib/ai/provider";

export type PublicAiSettings = {
  provider: AiProviderName;
  model: string;
  hasApiKey: boolean;
  keyPreview: string | null;
  source: "database" | "env";
  updatedAt: string | null;
};

export type AiUsageSummary = {
  requests30d: number;
  requestsToday: number;
  tokens30d: number;
  tokensToday: number;
  model: string;
  provider: AiProviderName;
  byFeature: { feature: string; label: string; count: number; tokens: number }[];
};

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}
