import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuditEvent } from "@/lib/audit/log-admin-action";
import { getEffectiveAccess } from "@/lib/auth/effective-access";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import {
 canShadowTenantStatus,
 clearShadowCookiesOnResponse,
 isValidShadowTenantId,
 isValidUuid,
 shadowCookieOptions,
 SHADOW_CEILING_COOKIE,
 SHADOW_IMPERSONATE_USER_COOKIE,
 SHADOW_MODE_COOKIE,
 SHADOW_TENANT_COOKIE,
 SHADOW_TENANT_NAME_COOKIE,
 type ShadowMode,
} from "@/lib/auth/shadow-tenant";
import { WORKSPACE_HAT_COOKIE } from "@/lib/auth/workspace";
import { getTenantById } from "@/lib/tenant/tenants";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Open a tenant workspace without re-auth.
 * - admin → Tenant Admin (+ Manager/User in switcher)
 * - manager → Manager (+ User in switcher)
 * - se → User portal only
 * - user → SE mode + optional impersonateUserId hint
 */
const startShadowSchema = z.object({
 tenantId: z.string().uuid(),
 mode: z.enum(["admin", "manager", "se", "user"]).optional().default("admin"),
 userId: z.string().uuid().optional(),
});

function clearShadowCookies(response: NextResponse) {
 clearShadowCookiesOnResponse(response);
}

export async function GET() {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const { data: profile } = await session.supabase
 .from("profiles")
 .select("tenant_id")
 .eq("id", session.user.id)
 .maybeSingle();

 const access = await getEffectiveAccess(session.role, (profile as { tenant_id: string | null } | null)?.tenant_id ?? null);

 return NextResponse.json({
 isShadowing: access.isShadowing,
 tenantId: access.tenantId,
 tenantName: access.shadowTenantName,
 mode: access.shadowMode,
 impersonateUserId: access.impersonateUserId,
 });
}

export async function POST(request: Request) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const parsed = startShadowSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 if (!isValidShadowTenantId(parsed.data.tenantId)) {
 return NextResponse.json({ error: "Invalid tenant id." }, { status: 400 });
 }

 const tenant = await getTenantById(parsed.data.tenantId);
 if (!tenant || !canShadowTenantStatus(tenant.status)) {
 return NextResponse.json({ error: "Tenant is not available for shadowing." }, { status: 404 });
 }

 if (tenant.status === "provisioning") {
 if (
 process.env.NODE_ENV === "production" &&
 process.env.ALLOW_SHADOW_PROVISIONING_ACTIVATE !== "true"
 ) {
 return NextResponse.json(
 { error: "Tenant is still provisioning and cannot be shadowed in production." },
 { status: 403 },
 );
 }

 const admin = createAdminClient();
 await admin?.from("tenants").update({ status: "active" }).eq("id", tenant.id);
 }

 const requestedMode = parsed.data.mode;
 let impersonateUserId: string | null = null;

 if (requestedMode === "user") {
 if (!isValidUuid(parsed.data.userId)) {
 return NextResponse.json({ error: "userId is required for mode 'user'." }, { status: 400 });
 }

 const admin = createAdminClient();
 const { data: targetProfile } = admin
 ? await admin
 .from("profiles")
 .select("id, email, tenant_id")
 .eq("id", parsed.data.userId)
 .maybeSingle()
 : { data: null };

 if (!targetProfile || targetProfile.tenant_id !== tenant.id) {
 return NextResponse.json({ error: "User not found in this tenant." }, { status: 404 });
 }

 impersonateUserId = targetProfile.id;
 }

 const cookieMode: ShadowMode =
 requestedMode === "admin" ? "admin" : requestedMode === "manager" ? "manager" : "se";
 const workspaceHat =
 cookieMode === "admin" ? "tenant_admin" : cookieMode === "manager" ? "manager" : "se";
 const redirect =
 cookieMode === "admin" ? "/admin" : cookieMode === "manager" ? "/manager?section=command" : "/dashboard";

 await requireAuditEvent(session.user.id, {
 action: "tenant.shadow_started",
 targetType: "tenant",
 targetId: tenant.id,
 tenantId: tenant.id,
 details: {
 tenantName: tenant.name,
 tenantSlug: tenant.slug,
 mode: requestedMode,
 enterMode: cookieMode,
 impersonateUserId,
 },
 });

 if (impersonateUserId) {
 await requireAuditEvent(session.user.id, {
 action: "operator.impersonation_started",
 targetType: "user",
 targetId: impersonateUserId,
 tenantId: tenant.id,
 details: {
 tenantName: tenant.name,
 tenantSlug: tenant.slug,
 shadowMode: cookieMode,
 },
 });
 }

 const response = NextResponse.json({
 tenantId: tenant.id,
 tenantName: tenant.name,
 mode: cookieMode,
 impersonateUserId,
 redirect,
 });

 const options = shadowCookieOptions();
 response.cookies.set(SHADOW_TENANT_COOKIE, tenant.id, options);
 response.cookies.set(SHADOW_TENANT_NAME_COOKIE, tenant.name, options);
 response.cookies.set(SHADOW_MODE_COOKIE, cookieMode, options);
 response.cookies.set(SHADOW_CEILING_COOKIE, cookieMode, options);
 response.cookies.set(WORKSPACE_HAT_COOKIE, workspaceHat, {
 path: "/",
 httpOnly: true,
 sameSite: "lax",
 secure: process.env.NODE_ENV === "production",
 maxAge: 60 * 60 * 24 * 180,
 });

 if (impersonateUserId) {
 response.cookies.set(SHADOW_IMPERSONATE_USER_COOKIE, impersonateUserId, options);
 } else {
 response.cookies.set(SHADOW_IMPERSONATE_USER_COOKIE, "", { ...options, maxAge: 0 });
 }

 return response;
}

export async function DELETE() {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const access = await getEffectiveAccess(session.role, null);

 if (access.isShadowing && access.tenantId) {
 await requireAuditEvent(session.user.id, {
 action: "tenant.shadow_ended",
 targetType: "tenant",
 targetId: access.tenantId,
 tenantId: access.tenantId,
 details: {
 tenantName: access.shadowTenantName,
 mode: access.shadowMode,
 impersonateUserId: access.impersonateUserId,
 },
 });
 }

 const response = NextResponse.json({ redirect: "/platform" });
 clearShadowCookies(response);
 return response;
}
