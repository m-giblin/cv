import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import {
 MAX_RETENTION_DAYS,
 MAX_SESSION_IDLE_MINUTES,
 MIN_RETENTION_DAYS,
 MIN_SESSION_IDLE_MINUTES,
 mergeFeatureFlags,
} from "@/lib/platform/settings-shared";
import { loadPlatformSettings, savePlatformSettings } from "@/lib/platform/settings";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { changedFeatureIds, lockedFeatureIds } from "@/lib/admin/feature-settings";
import { getTenantById } from "@/lib/tenant/tenants";

async function tenantLockedFeatures(tenantId: string): Promise<string[]> {
 const tenant = await getTenantById(tenantId).catch(() => null);
 return lockedFeatureIds(tenant?.billingPlan ?? null);
}

const updateSchema = z.object({
 sessionIdleMinutes: z.number().int().min(MIN_SESSION_IDLE_MINUTES).max(MAX_SESSION_IDLE_MINUTES).optional(),
 featureFlags: z.record(z.string(), z.boolean()).optional(),
 auditLogRetentionDays: z.number().int().min(MIN_RETENTION_DAYS).max(MAX_RETENTION_DAYS).optional(),
 activityLogRetentionDays: z.number().int().min(MIN_RETENTION_DAYS).max(MAX_RETENTION_DAYS).optional(),
 aiUsageRetentionDays: z.number().int().min(MIN_RETENTION_DAYS).max(MAX_RETENTION_DAYS).optional(),
});

export async function GET() {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const [settings, lockedFeatures] = await Promise.all([
 loadPlatformSettings(session.tenantId),
 tenantLockedFeatures(session.tenantId),
 ]);
 return NextResponse.json({ settings, lockedFeatures });
}

export async function PATCH(request: Request) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const parsed = updateSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 if (parsed.data.featureFlags !== undefined) {
 // Feature flags are operator-managed (see TENANT_ADMINS_CAN_EDIT_FEATURES); locked features are rejected.
 const [current, locked] = await Promise.all([
 loadPlatformSettings(session.tenantId),
 tenantLockedFeatures(session.tenantId),
 ]);
 const lockedChanges = changedFeatureIds(current.featureFlags, parsed.data.featureFlags).filter((id) =>
 locked.includes(id),
 );
 if (lockedChanges.length > 0) {
 return NextResponse.json(
 { error: "Feature flags are managed by the platform operator. Contact support to request changes.", lockedChanges },
 { status: 403 },
 );
 }
 }

 try {
 const admin = createAdminClient();
 if (!admin) {
 return NextResponse.json({ error: "Service role is not configured." }, { status: 503 });
 }

 const settings = await savePlatformSettings(admin, session.user.id, {
 tenantId: session.tenantId,
 sessionIdleMinutes: parsed.data.sessionIdleMinutes,
 featureFlags: parsed.data.featureFlags ? mergeFeatureFlags(parsed.data.featureFlags) : undefined,
 auditLogRetentionDays: parsed.data.auditLogRetentionDays,
 activityLogRetentionDays: parsed.data.activityLogRetentionDays,
 aiUsageRetentionDays: parsed.data.aiUsageRetentionDays,
 });

 await logAuditEvent(session.user.id, {
 action: "platform_settings.updated",
 targetType: "platform_settings",
 targetId: session.tenantId,
 tenantId: session.tenantId,
 details: parsed.data,
 });

 return NextResponse.json({ settings });
 } catch (error) {
 const message = error instanceof Error ? error.message : "Could not save platform settings.";
 return NextResponse.json({ error: message }, { status: 500 });
 }
}
