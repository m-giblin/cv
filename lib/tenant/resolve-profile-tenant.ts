import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export async function resolveProfileTenantId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
  return (data as { tenant_id: string | null } | null)?.tenant_id ?? null;
}

/**
 * The tenant the signed-in person is working in: the shadowed tenant for operators, otherwise
 * their own. Operators have no home tenant, so the profile alone would find nothing.
 */
export async function resolveEffectiveTenantId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { resolveTenantContext } = await import("@/lib/auth/tenant-context");
  const context = await resolveTenantContext().catch(() => null);
  return context?.tenantId ?? (await resolveProfileTenantId(supabase, userId));
}
