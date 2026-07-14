import { cookies } from "next/headers";
import { getAccessTier, type AccessTier } from "@/lib/auth/rbac";
import {
  resolveEffectiveAccess,
  SHADOW_MODE_COOKIE,
  SHADOW_TENANT_COOKIE,
  SHADOW_TENANT_NAME_COOKIE,
} from "@/lib/auth/shadow-tenant";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/types";

export type TenantContext = {
  userId: string;
  role: ProfileRole;
  tier: AccessTier;
  tenantId: string | null;
  profileTenantId: string | null;
  isShadowing: boolean;
};

export async function resolveTenantContext(): Promise<TenantContext | null> {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as { role: ProfileRole; tenant_id: string | null } | null)?.role ?? "basic_se";
  const profileTenantId = (profile as { tenant_id: string | null } | null)?.tenant_id ?? null;

  const cookieStore = await cookies();
  const access = resolveEffectiveAccess(
    role,
    profileTenantId,
    cookieStore.get(SHADOW_TENANT_COOKIE)?.value ?? null,
    cookieStore.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
    cookieStore.get(SHADOW_MODE_COOKIE)?.value ?? null,
  );

  return {
    userId: user.id,
    role,
    tier: access.tier,
    tenantId: access.tenantId ?? profileTenantId,
    profileTenantId,
    isShadowing: access.isShadowing,
  };
}

export type DashboardScope = "personal" | "org" | "tenant";

export function dashboardScopeForContext(context: TenantContext): DashboardScope | null {
  if (context.tier === "super_admin" && !context.isShadowing) {
    return "org";
  }

  if (context.tier === "admin") {
    return "tenant";
  }

  if (context.tier === "manager") {
    return "org";
  }

  return "personal";
}
