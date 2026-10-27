import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { findActiveMentor } from "@/lib/mentoring/share-with-mentor";
import type { PitchStepContext } from "@/lib/pitch/pitch-step";
import { createAdminClient } from "@/lib/supabase/admin";

export type { PitchStepContext };

export type PitchStudioContext = {
  /** Set when Pitch Studio was opened from a ramp step (?step=<assignment step id>). */
  step: PitchStepContext | null;
  /** The mentor on the SE's active plan, for the step banner and "Share with my mentor". */
  mentorName: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The ramp step Pitch Studio is working on, read with the SE's session so only their own step resolves. */
export async function loadPitchStudioContext(
  supabase: SupabaseClient<Database> | null,
  userId: string,
  stepParam: string | undefined,
): Promise<PitchStudioContext> {
  const admin = createAdminClient() as SupabaseClient<Database> | null;
  const [step, mentor] = await Promise.all([
    supabase && stepParam && UUID.test(stepParam) ? loadStep(supabase, userId, stepParam) : Promise.resolve(null),
    admin ? findActiveMentor(admin, userId) : Promise.resolve(null),
  ]);
  return { step, mentorName: mentor?.mentorName ?? null };
}

async function loadStep(supabase: SupabaseClient<Database>, userId: string, assignmentStepId: string): Promise<PitchStepContext | null> {
  const { data: row } = await supabase
    .from("plan_assignment_steps")
    .select("id, status, plan_step_id, assignment_id")
    .eq("id", assignmentStepId)
    .maybeSingle();
  if (!row) return null;
  const [{ data: assignment }, { data: planStep }] = await Promise.all([
    supabase.from("plan_assignments").select("user_id").eq("id", row.assignment_id).maybeSingle(),
    supabase.from("plan_steps").select("title").eq("id", row.plan_step_id).maybeSingle(),
  ]);
  if (assignment?.user_id !== userId) return null;
  return { assignmentStepId: row.id, title: planStep?.title ?? "Pitch", status: row.status };
}
