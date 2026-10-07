import type { SupabaseClient } from "@supabase/supabase-js";

const PROFILE_COLUMNS = "id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  level: string;
  manager_id: string | null;
  avatar_url: string | null;
  created_at: string;
  tenant_id: string | null;
};

/**
 * A workspace's people without the inactive ones (bulk uploads waiting for activation), for team
 * lists and pickers. Selects every column so it still works before the status column exists.
 */
export async function loadActiveTenantProfiles<Row = ProfileRow>(client: SupabaseClient | unknown, tenantId: string) {
  const db = client as SupabaseClient;
  // Super admins whose home workspace is this one count as members. Without the column (migration
  // not applied yet) the "or" errors, so fall back to members only.
  let { data, error } = await db.from("profiles").select("*").or(`tenant_id.eq.${tenantId},home_tenant_id.eq.${tenantId}`);
  if (error) ({ data, error } = await db.from("profiles").select("*").eq("tenant_id", tenantId));
  const rows = ((data ?? []) as (ProfileRow & { status?: string })[])
    .filter((row) => row.status !== "inactive")
    .map((row) => Object.fromEntries(PROFILE_COLUMNS.split(", ").map((key) => [key, row[key as keyof ProfileRow] ?? null])) as Row);
  return { data: error ? null : rows, error };
}
