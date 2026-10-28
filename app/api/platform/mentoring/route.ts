import { NextResponse } from "next/server";
import { requireAuditEvent } from "@/lib/audit/log-admin-action";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import {
  SHADOW_CEILING_COOKIE,
  SHADOW_IMPERSONATE_USER_COOKIE,
  SHADOW_MODE_COOKIE,
  SHADOW_SESSION_COOKIE,
  SHADOW_TENANT_COOKIE,
  SHADOW_TENANT_NAME_COOKIE,
  canShadowTenantStatus,
  shadowCookieOptions,
} from "@/lib/auth/shadow-tenant";
import { WORKSPACE_HAT_COOKIE } from "@/lib/auth/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantById } from "@/lib/tenant/tenants";

/**
 * A platform operator who also mentors has no home tenant, so Mentoring only works inside the
 * mentees' tenant. This opens that tenant as a user (the same shadow session Tenants › Enter
 * starts, audited the same way) and lands on Mentoring. Linked with a plain <a>, never prefetched.
 */
export async function GET(request: Request) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;
  const home = new URL("/platform", request.url);

  const admin = createAdminClient();
  const { data: rows } = admin
    ? await admin
        .from("plan_assignments")
        .select("tenant_id")
        .eq("mentor_id", session.user.id)
        .neq("status", "completed")
        .limit(1)
    : { data: null };
  const tenantId = (rows as { tenant_id: string | null }[] | null)?.[0]?.tenant_id ?? null;
  const tenant = tenantId ? await getTenantById(tenantId) : null;
  if (!tenant || !canShadowTenantStatus(tenant.status)) return NextResponse.redirect(home);

  const shadowSessionId = crypto.randomUUID();
  await requireAuditEvent(session.user.id, {
    action: "tenant.shadow_started",
    targetType: "tenant",
    targetId: tenant.id,
    tenantId: tenant.id,
    details: { shadowSessionId, tenantName: tenant.name, tenantSlug: tenant.slug, mode: "se", enterMode: "se", reason: "mentoring" },
  });

  const response = NextResponse.redirect(new URL("/mentoring", request.url));
  const options = shadowCookieOptions();
  response.cookies.set(SHADOW_TENANT_COOKIE, tenant.id, options);
  response.cookies.set(SHADOW_TENANT_NAME_COOKIE, tenant.name, options);
  response.cookies.set(SHADOW_MODE_COOKIE, "se", options);
  response.cookies.set(SHADOW_CEILING_COOKIE, "se", options);
  response.cookies.set(SHADOW_SESSION_COOKIE, shadowSessionId, options);
  response.cookies.set(SHADOW_IMPERSONATE_USER_COOKIE, "", { ...options, maxAge: 0 });
  response.cookies.set(WORKSPACE_HAT_COOKIE, "se", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
  });
  return response;
}
