import type { SupabaseClient } from "@supabase/supabase-js";
import type { LanguageModelUsage } from "ai";
import { resolveTenantContext } from "@/lib/auth/tenant-context";

/**
 * Record one AI call. Usage dashboards (tenant Settings › AI, platform Usage) and the per-user
 * rate limit read these rows, so the tenant must be set: rows without it are invisible to both.
 */
export async function logAiUsage(
  supabase: SupabaseClient,
  input: {
    feature: string;
    provider: string;
    model: string;
    userId: string;
    usage?: LanguageModelUsage | null;
    /** Defaults to the signed-in user's effective tenant (the shadowed one for operators). */
    tenantId?: string | null;
  },
) {
  const promptTokens = input.usage?.inputTokens ?? 0;
  const completionTokens = input.usage?.outputTokens ?? 0;
  const totalTokens = input.usage?.totalTokens ?? promptTokens + completionTokens;

  let tenantId = input.tenantId ?? null;
  if (!tenantId) {
    const context = await resolveTenantContext().catch(() => null);
    tenantId = context?.tenantId ?? null;
  }
  if (!tenantId) {
    const { data } = await supabase.from("profiles").select("tenant_id").eq("id", input.userId).maybeSingle();
    tenantId = (data as { tenant_id: string | null } | null)?.tenant_id ?? null;
  }

  const { error } = await supabase.from("ai_usage_logs").insert({
    feature: input.feature,
    provider: input.provider,
    model: input.model,
    user_id: input.userId,
    tenant_id: tenantId,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  });
  if (error) {
    // Never fail the AI response over bookkeeping, but don't lose the signal either.
    console.warn(`[ai-usage] could not log ${input.feature}: ${error.message}`);
  }
}
