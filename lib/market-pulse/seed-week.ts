import { MARKET_PULSE_WEEKLY } from "@/lib/market-pulse/quiz";
import { currentWeekId } from "@/lib/market-pulse/week";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveEffectiveTenantId } from "@/lib/tenant/resolve-profile-tenant";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

export function defaultMarketPulseQuestions() {
  return MARKET_PULSE_WEEKLY.map((q) => ({
    id: q.id,
    topic: q.topic,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));
}

export async function ensureMarketPulseWeek(
  supabase: NonNullable<Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>>,
  weekId = currentWeekId(),
  tenantId?: string | null,
  userId?: string,
) {
  const resolvedTenantId =
    tenantId ??
    (userId ? ((await resolveEffectiveTenantId(supabase, userId)) ?? DEFAULT_TENANT_ID) : DEFAULT_TENANT_ID);

  const { data: existing } = await supabase
    .from("market_pulse_weeks")
    .select("week_id, questions")
    .eq("tenant_id", resolvedTenantId)
    .eq("week_id", weekId)
    .maybeSingle();

  if (existing) {
    return {
      weekId,
      tenantId: resolvedTenantId,
      questions: existing.questions as ReturnType<typeof defaultMarketPulseQuestions>,
    };
  }

  // Only managers may write weeks under RLS, but whoever opens the pulse first each week (usually an SE)
  // has to create it, or their answers have no week to attach to. The row is seeded content, so the
  // service role writes it; a second opener in the same moment leaves the first row alone.
  const questions = defaultMarketPulseQuestions();
  const admin = createAdminClient();
  await (admin ?? supabase)
    .from("market_pulse_weeks")
    .upsert({ week_id: weekId, tenant_id: resolvedTenantId, questions, source: "seed" }, { onConflict: "tenant_id,week_id", ignoreDuplicates: true });

  return { weekId, tenantId: resolvedTenantId, questions };
}
