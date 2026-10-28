import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Objection practice for someone still on their onboarding ramp runs on easy. Most new hires have
 * never done a roleplay, and a buyer who keeps pushing back leaves them stuck instead of learning.
 * The scenarios are shared library content that experienced SEs use at full strength, so the easy
 * setting is added to the new hire's own copy of the prompt, never to the scenario itself.
 */
export const NEW_HIRE_EASY_MODE = `

DIFFICULTY OVERRIDE: EASY (new hire practice). This replaces any difficulty, tone or push-back rule above.
- The rep is new and may never have done a roleplay. Play the buyer as patient and open, not hostile.
- Raise each objection once, in plain words. Push back at most once, gently, then accept any reasonable answer and move on.
- No surprises, interruptions or new objections beyond the ones above.
- Keep replies short so the rep can follow.
- If the rep seems stuck or gives a very short answer, offer a hint in one sentence without being asked.
- Score for the right idea and effort, not polish. In coaching notes, lead with what worked, then one thing to try next time.
- Always let the drill reach its end and debrief.`;

/** Objection-handling drills say so throughout their prompt; discovery scenarios mention objections in passing. */
export function isObjectionPractice(promptBody: string): boolean {
  return (promptBody.match(/objection/gi) ?? []).length >= 3;
}

export function withNewHireEasyMode(promptBody: string): string {
  return promptBody.includes("DIFFICULTY OVERRIDE: EASY") ? promptBody : `${promptBody}${NEW_HIRE_EASY_MODE}`;
}

/** Someone with an onboarding plan still open is a new hire for practice purposes. */
export async function isOnOnboardingRamp(supabase: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("plan_assignments")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "completed")
    .limit(1);
  return Boolean(data?.length);
}
