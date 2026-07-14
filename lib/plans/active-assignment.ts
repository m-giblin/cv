import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export async function getActiveAssignmentUserIdsForPlan(
  supabase: SupabaseClient<Database>,
  planId: string,
  userIds?: string[],
): Promise<Set<string>> {
  let builder = supabase
    .from("plan_assignments")
    .select("user_id")
    .eq("plan_id", planId)
    .neq("status", "completed");

  if (userIds && userIds.length > 0) {
    builder = builder.in("user_id", userIds);
  }

  const { data } = await builder;

  return new Set((data ?? []).map((row) => row.user_id));
}
