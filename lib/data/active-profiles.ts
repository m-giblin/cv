import type { SupabaseClient } from "@supabase/supabase-js";
import { legacyWorkspaceMemberFilter, workspaceMemberFilter } from "@/lib/tenant/workspace-members";

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
  const { data, error } = await loadWorkspaceProfileRows(db, tenantId);
  const rows = ((data ?? []) as (ProfileRow & { status?: string })[])
    .filter((row) => row.status !== "inactive")
    .map((row) => Object.fromEntries(PROFILE_COLUMNS.split(", ").map((key) => [key, row[key as keyof ProfileRow] ?? null])) as Row);
  return { data: error ? null : rows, error };
}

/**
 * Every profile row in a workspace, super-admin members included, with all columns. Falls back
 * step by step while the membership columns are still being added: home workspace only, then
 * tenant members only.
 */
export async function loadWorkspaceProfileRows(client: SupabaseClient | unknown, tenantId: string, orderBy?: string) {
  const db = client as SupabaseClient;
  const run = (apply: (query: ReturnType<ReturnType<SupabaseClient["from"]>["select"]>) => typeof query) => {
    const query = apply(db.from("profiles").select("*"));
    return orderBy ? query.order(orderBy) : query;
  };
  let result = await run((query) => query.or(workspaceMemberFilter(tenantId)));
  if (result.error) result = await run((query) => query.or(legacyWorkspaceMemberFilter(tenantId)));
  if (result.error) result = await run((query) => query.eq("tenant_id", tenantId));
  return { data: result.data as Record<string, unknown>[] | null, error: result.error };
}
