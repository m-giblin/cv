import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

// Generated DB types lag migrations; tenant-scoped admin queries use a loose client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = SupabaseClient<any>;

export function getTenantAdminClient(): LooseClient | null {
  return createAdminClient() as unknown as LooseClient | null;
}

/** Prefer service-role + explicit tenant filter over session RLS (super_admin bypasses tenant RLS). */
export function tenantTable(tenantId: string) {
  const admin = getTenantAdminClient();
  if (!admin) {
    return null;
  }

  return {
    admin,
    tenantId,
    select(table: string, columns = "*") {
      return admin.from(table).select(columns).eq("tenant_id", tenantId);
    },
    from(table: string) {
      return admin.from(table);
    },
  };
}

export async function assertTenantOwnedRow(
  tenantId: string,
  table: string,
  id: string,
): Promise<boolean> {
  const admin = getTenantAdminClient();
  if (!admin) {
    return false;
  }

  const { data } = await admin.from(table).select("tenant_id").eq("id", id).maybeSingle();

  return (data as { tenant_id?: string | null } | null)?.tenant_id === tenantId;
}
