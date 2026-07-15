import { MARKET_PULSE_WEEKLY } from "@/lib/market-pulse/quiz";
import { currentWeekId } from "@/lib/market-pulse/week";
import { resolveProfileTenantId } from "@/lib/tenant/resolve-profile-tenant";
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
    (userId ? ((await resolveProfileTenantId(supabase, userId)) ?? DEFAULT_TENANT_ID) : DEFAULT_TENANT_ID);

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

  const questions = defaultMarketPulseQuestions();
  await supabase.from("market_pulse_weeks").insert({
    week_id: weekId,
    tenant_id: resolvedTenantId,
    questions,
    source: "seed",
  });

  return { weekId, tenantId: resolvedTenantId, questions };
}
