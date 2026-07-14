import { MARKET_PULSE_WEEKLY } from "@/lib/market-pulse/quiz";
import { currentWeekId } from "@/lib/market-pulse/week";

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
) {
  const { data: existing } = await supabase
    .from("market_pulse_weeks")
    .select("week_id, questions")
    .eq("week_id", weekId)
    .maybeSingle();

  if (existing) {
    return { weekId, questions: existing.questions as ReturnType<typeof defaultMarketPulseQuestions> };
  }

  const questions = defaultMarketPulseQuestions();
  await supabase.from("market_pulse_weeks").insert({
    week_id: weekId,
    questions,
    source: "seed",
  });

  return { weekId, questions };
}
