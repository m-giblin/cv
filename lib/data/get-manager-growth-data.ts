import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type ReadinessCertRow = {
  id: string;
  userId: string;
  certificationType: string;
  status: string;
};

export async function fetchReadinessCertifications(
  userIds: string[],
  client?: SupabaseClient<Database>,
): Promise<ReadinessCertRow[]> {
  if (userIds.length === 0) {
    return [];
  }

  const supabase = client ?? (await createClient());
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("readiness_certifications")
    .select("id, user_id, certification_type, status")
    .in("user_id", userIds);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    certificationType: row.certification_type,
    status: row.status,
  }));
}

export async function fetchManagerCoachingNotes(
  managerId: string,
  seUserIds: string[],
  client?: SupabaseClient<Database>,
): Promise<Record<string, string>> {
  if (seUserIds.length === 0) {
    return {};
  }

  const supabase = client ?? (await createClient());
  if (!supabase) {
    return {};
  }

  const { data, error } = await supabase
    .from("manager_coaching_notes")
    .select("se_user_id, notes")
    .eq("manager_id", managerId)
    .in("se_user_id", seUserIds);

  if (error || !data) {
    return {};
  }

  return Object.fromEntries(data.map((row) => [row.se_user_id, row.notes ?? ""]));
}
