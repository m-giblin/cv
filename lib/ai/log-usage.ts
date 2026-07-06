import type { SupabaseClient } from "@supabase/supabase-js";
import type { LanguageModelUsage } from "ai";

export async function logAiUsage(
  supabase: SupabaseClient,
  input: {
    feature: string;
    provider: string;
    model: string;
    userId: string;
    usage?: LanguageModelUsage | null;
  },
) {
  const promptTokens = input.usage?.inputTokens ?? 0;
  const completionTokens = input.usage?.outputTokens ?? 0;
  const totalTokens = input.usage?.totalTokens ?? promptTokens + completionTokens;

  await supabase.from("ai_usage_logs").insert({
    feature: input.feature,
    provider: input.provider,
    model: input.model,
    user_id: input.userId,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  });
}
