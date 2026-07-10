import { NextResponse } from "next/server";
import { User } from "@supabase/supabase-js";
import { getAccessTier } from "@/lib/auth/rbac";
import { getEffectiveAccess } from "@/lib/auth/effective-access";
import { isAllowedEmail, allowedEmailDomainsLabel } from "@/lib/auth/email-domain";
import { getTenantById } from "@/lib/tenant/tenants";
import { canShadowTenantStatus } from "@/lib/auth/shadow-tenant";
import { createClient } from "@/lib/supabase/server";
import { applySessionTenant } from "@/lib/supabase/tenant-session";
import { ProfileRole } from "@/lib/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

type AdminSession = {
  supabase: SupabaseClient<Database>;
  user: User;
  role: ProfileRole;
  tenantId: string;
  isShadowing: boolean;
};

export async function requireAdminSession(): Promise<AdminSession | NextResponse> {
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
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const access = await getEffectiveAccess(role, profileTenantId);

  if (access.tier !== "admin" || !access.tenantId) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  if (access.isShadowing) {
    const tenant = await getTenantById(access.tenantId);
    if (!tenant || !canShadowTenantStatus(tenant.status)) {
      return NextResponse.json({ error: "Shadow tenant is not available." }, { status: 403 });
    }

    try {
      await applySessionTenant(supabase, access.tenantId);
    } catch {
      // App-layer tenantTable() remains the primary guard if RPC is unavailable.
    }
  } else if (getAccessTier(role) !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  return {
    supabase,
    user,
    role,
    tenantId: access.tenantId,
    isShadowing: access.isShadowing,
  };
}

export function validateAllowedEmail(email: string) {
  if (!isAllowedEmail(email)) {
    return `Email must use ${allowedEmailDomainsLabel()}.`;
  }

  return null;
}

/** @deprecated use validateAllowedEmail */
export function validateSailPointEmail(email: string) {
  return validateAllowedEmail(email);
}
