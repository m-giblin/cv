import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export async function getUserReleaseProjectTags(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data: assignments } = await supabase
    .from("plan_assignments")
    .select("plan_id")
    .eq("user_id", userId)
    .neq("status", "completed");

  const planIds = [...new Set((assignments ?? []).map((row) => row.plan_id))];
  if (planIds.length === 0) {
    return [];
  }

  const { data: courses } = await supabase
    .from("release_courses")
    .select("project_tag")
    .in("plan_id", planIds);

  return [...new Set((courses ?? []).map((row) => row.project_tag).filter(Boolean))];
}
