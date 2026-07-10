import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Set Postgres app.tenant_id for super-admin shadow sessions (transaction-local). */
export async function applySessionTenant(
  supabase: SupabaseClient<Database>,
  tenantId: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("set_session_tenant", {
    p_tenant_id: tenantId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
