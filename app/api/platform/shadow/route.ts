import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { getEffectiveAccess } from "@/lib/auth/effective-access";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import {
 canShadowTenantStatus,
 clearShadowCookiesOnResponse,
 isValidShadowTenantId,
 shadowCookieOptions,
 SHADOW_MODE_COOKIE,
 SHADOW_TENANT_COOKIE,
 SHADOW_TENANT_NAME_COOKIE,
} from "@/lib/auth/shadow-tenant";
import { getTenantById } from "@/lib/tenant/tenants";
import { createAdminClient } from "@/lib/supabase/admin";

const startShadowSchema = z.object({
 tenantId: z.string().uuid(),
 mode: z.enum(["admin", "se"]).optional().default("admin"),
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

 const mode = parsed.data.mode;

 await logAuditEvent(session.user.id, {
 action: "tenant.shadow_started",
 targetType: "tenant",
 targetId: tenant.id,
 tenantId: tenant.id,
 details: { tenantName: tenant.name, tenantSlug: tenant.slug, mode },
 });

 const response = NextResponse.json({
 tenantId: tenant.id,
 tenantName: tenant.name,
 mode,
 redirect: mode === "se" ? "/dashboard" : "/admin",
 });

 const options = shadowCookieOptions();
 response.cookies.set(SHADOW_TENANT_COOKIE, tenant.id, options);
 response.cookies.set(SHADOW_TENANT_NAME_COOKIE, tenant.name, options);
 response.cookies.set(SHADOW_MODE_COOKIE, mode, options);

 return response;
}

export async function DELETE() {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const access = await getEffectiveAccess(session.role, null);

 if (access.isShadowing && access.tenantId) {
 await logAuditEvent(session.user.id, {
 action: "tenant.shadow_ended",
 targetType: "tenant",
 targetId: access.tenantId,
 tenantId: access.tenantId,
 details: { tenantName: access.shadowTenantName, mode: access.shadowMode },
 });
 }

 const response = NextResponse.json({ redirect: "/platform" });
 clearShadowCookies(response);
 return response;
}
