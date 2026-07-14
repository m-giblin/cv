import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { User } from "@supabase/supabase-js";
import {
  canShadowTenantStatus,
  resolveEffectiveAccess,
  SHADOW_MODE_COOKIE,
  SHADOW_TENANT_COOKIE,
  SHADOW_TENANT_NAME_COOKIE,
} from "@/lib/auth/shadow-tenant";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { createClient } from "@/lib/supabase/server";
import { applySessionTenant } from "@/lib/supabase/tenant-session";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";
import { ProfileRole } from "@/lib/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

type ManagerSession = {
  supabase: SupabaseClient<Database>;
  user: User;
  role: ProfileRole;
  tenantId: string;
  isShadowing: boolean;
};

export async function requireManagerSession(): Promise<ManagerSession | NextResponse> {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, email, full_name, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as { role: ProfileRole; tenant_id: string | null } | null)?.role;
  const profileTenantId = (profile as { tenant_id: string | null } | null)?.tenant_id ?? null;

  if (!role) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const access = resolveEffectiveAccess(
    role,
    profileTenantId,
    cookieStore.get(SHADOW_TENANT_COOKIE)?.value ?? null,
    cookieStore.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
    cookieStore.get(SHADOW_MODE_COOKIE)?.value ?? null,
  );

  const managerCapable =
    access.tier === "admin" || access.tier === "manager" || access.actualTier === "super_admin";

  if (!managerCapable) {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }

  const tenantId = access.tenantId ?? profileTenantId ?? DEFAULT_TENANT_ID;

  if (access.isShadowing) {
    const admin = getTenantAdminClient();
    const { data: tenant } = admin
      ? await admin.from("tenants").select("status").eq("id", access.tenantId).maybeSingle()
      : { data: null };
    if (!tenant || !canShadowTenantStatus((tenant as { status: string }).status)) {
      return NextResponse.json({ error: "Shadow tenant is not available." }, { status: 403 });
    }

    try {
      await applySessionTenant(supabase, tenantId);
    } catch {
      // App-layer tenant scoping remains the primary guard.
    }
  }

  return {
    supabase,
    user,
    role,
    tenantId,
    isShadowing: access.isShadowing,
  };
}
