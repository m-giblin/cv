import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAiProvider } from "@/lib/ai/provider";
import type { Database } from "@/lib/database.types";
import { resolveProfileTenantId } from "@/lib/tenant/resolve-profile-tenant";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

export async function resolveAiProviderForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const tenantId = (await resolveProfileTenantId(supabase, userId)) ?? DEFAULT_TENANT_ID;
  return resolveAiProvider(tenantId);
}

export async function resolveAiProviderForTenant(tenantId: string | null | undefined) {
  return resolveAiProvider(tenantId ?? DEFAULT_TENANT_ID);
}
