import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

import { coachingCardScore } from "@/lib/coaching/card-score";

const ADAPTIVE_SIM_THRESHOLD = 85;

export async function computeAdaptiveSegmentSkip(
  supabase: SupabaseClient<Database>,
  userId: string,
  segmentIndex: number,
): Promise<{ eligible: boolean; reason: string }> {
  const { data: cards } = await supabase
    .from("coaching_cards")
    .select("structured_output")
    .eq("user_id", userId)
    .eq("is_practice", false)
    .order("created_at", { ascending: false })
    .limit(5);

  const scores = (cards ?? []).map((c) => coachingCardScore(c.structured_output));
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const { data: pitches } = await supabase
    .from("pitch_submissions")
    .select("manager_grade")
    .eq("user_id", userId)
    .not("manager_grade", "is", null)
    .order("created_at", { ascending: false })
    .limit(3);

  const pitchAvg =
    pitches?.length && pitches.every((p) => p.manager_grade !== null)
      ? pitches.reduce((t, p) => t + (p.manager_grade ?? 0), 0) / pitches.length
      : 0;

  if (avg >= ADAPTIVE_SIM_THRESHOLD && pitchAvg >= 4) {
    return {
      eligible: true,
      reason: `Simulation avg ${Math.round(avg)} and pitch grade ${pitchAvg.toFixed(1)} — eligible to skip segment ${segmentIndex} content reviews.`,
    };
  }

  return {
    eligible: false,
    reason: `Need simulation avg ≥${ADAPTIVE_SIM_THRESHOLD} and pitch grade ≥4 (current: ${Math.round(avg)}, ${pitchAvg.toFixed(1)}).`,
  };
}
