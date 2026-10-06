import { cookies } from "next/headers";
import { getAuthenticatedUser } from "@/lib/data/get-authenticated-user";
import { getAccessTier } from "@/lib/auth/rbac";
import {
  canShadowTenantStatus,
  resolveEffectiveAccess,
  SHADOW_MODE_COOKIE,
  SHADOW_TENANT_COOKIE,
} from "@/lib/auth/shadow-tenant";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/types";

function isInManagerOrg(
  profiles: Array<{ id: string; manager_id: string | null }>,
  managerId: string,
  targetUserId: string,
) {
  let current = profiles.find((profile) => profile.id === targetUserId)?.manager_id ?? null;

  while (current) {
    if (current === managerId) {
      return true;
    }
    current = profiles.find((profile) => profile.id === current)?.manager_id ?? null;
  }

  return false;
}

export async function canReviewUserWork(targetUserId: string) {
  const supabase = await createClient();
  if (!supabase) {
    return false;
  }

  const user = await getAuthenticatedUser();

  if (!user || user.id === targetUserId) {
    return false;
  }

  const shadowTenantId = await shadowReviewTenant(supabase, user.id);
  if (shadowTenantId) {
    // A super-admin shadowing a tenant as manager or admin sees that tenant's inbox, so they may
    // review work from people in that tenant only. RLS hides other tenants' profiles from the
    // operator's own client, so membership is checked with the tenant admin client.
    const admin = getTenantAdminClient();
    if (!admin) return false;
    const { data: target } = await admin.from("profiles").select("tenant_id").eq("id", targetUserId).maybeSingle();
    return (target as { tenant_id: string | null } | null)?.tenant_id === shadowTenantId;
  }

  const { data: profiles, error } = await supabase.from("profiles").select("id, role, manager_id");

  if (error || !profiles?.length) {
    return false;
  }

  const reviewer = profiles.find((profile) => profile.id === user.id);
  if (!reviewer) {
    return false;
  }

  const tier = getAccessTier(reviewer.role as ProfileRole);

  if (tier === "admin") {
    return profiles.some((profile) => profile.id === targetUserId);
  }

  if (tier === "manager") {
    return isInManagerOrg(profiles, user.id, targetUserId);
  }

  return false;
}

/** The shadowed tenant id when a super-admin is shadowing as manager or admin, else null. */
async function shadowReviewTenant(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
): Promise<string | null> {
  const cookieStore = await cookies();
  const shadowTenantId = cookieStore.get(SHADOW_TENANT_COOKIE)?.value ?? null;
  if (!shadowTenantId) return null;

  const { data: profile } = await supabase.from("profiles").select("role, tenant_id").eq("id", userId).maybeSingle();
  const row = profile as { role: ProfileRole; tenant_id: string | null } | null;
  if (!row) return null;

  const access = resolveEffectiveAccess(
    row.role,
    row.tenant_id,
    shadowTenantId,
    null,
    cookieStore.get(SHADOW_MODE_COOKIE)?.value ?? null,
  );
  if (!access.isShadowing || access.actualTier !== "super_admin" || !access.tenantId) return null;
  if (access.shadowMode !== "manager" && access.shadowMode !== "admin") return null;

  const admin = getTenantAdminClient();
  const { data: tenant } = admin
    ? await admin.from("tenants").select("status").eq("id", access.tenantId).maybeSingle()
    : { data: null };
  if (!tenant || !canShadowTenantStatus((tenant as { status: string }).status)) return null;
  return access.tenantId;
}
