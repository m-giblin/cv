import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { mergeFeatureFlags, type PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import type { Database } from "@/lib/database.types";

async function loadTenantFeatureFlags(tenantId: string | null | undefined): Promise<PlatformFeatureFlags> {
  if (!tenantId) return mergeFeatureFlags({});
  const admin = createAdminClient();
  if (!admin) return mergeFeatureFlags({});

  const { data } = await admin
    .from("platform_settings")
    .select("feature_flags")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (data?.feature_flags) {
    return mergeFeatureFlags(data.feature_flags as PlatformFeatureFlags);
  }

  const legacy = await admin.from("platform_settings").select("feature_flags").eq("id", "default").maybeSingle();
  return mergeFeatureFlags(legacy.data?.feature_flags as PlatformFeatureFlags | undefined);
}

async function resolveUserTenantId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
  return (data as { tenant_id: string | null } | null)?.tenant_id ?? null;
}

/**
 * API entitlement gate. Returns a 403 Response when the flag is off for the tenant.
 */
export async function requireTenantFeature(
  tenantId: string | null | undefined,
  flagId: string,
): Promise<NextResponse | null> {
  const flags = await loadTenantFeatureFlags(tenantId);
  if (isFeatureEnabled(flags, flagId)) return null;
  return NextResponse.json(
    { error: `Feature "${flagId}" is not enabled for this tenant.`, code: "FEATURE_DISABLED", flagId },
    { status: 403 },
  );
}

/** Resolve the caller's tenant and gate on a feature flag. */
export async function requireUserFeature(
  supabase: SupabaseClient<Database>,
  userId: string,
  flagId: string,
): Promise<NextResponse | null> {
  const tenantId = await resolveUserTenantId(supabase, userId);
  return requireTenantFeature(tenantId, flagId);
}
