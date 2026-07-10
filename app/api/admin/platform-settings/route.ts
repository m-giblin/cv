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

 const settings = await loadPlatformSettings(session.tenantId);
 return NextResponse.json({ settings });
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
 return NextResponse.json(
 { error: "Feature flags are managed by the platform operator. Contact support to request changes." },
 { status: 403 },
 );
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
