import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { getTenantSettings, getTenantUsageSummary, updateTenantFeatureFlags } from "@/lib/tenant/tenants";
import { mergeFeatureFlags } from "@/lib/platform/settings-shared";

const patchSchema = z.object({
 featureFlags: z.record(z.string(), z.boolean()).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const { id } = await context.params;
 const [settings, usage] = await Promise.all([getTenantSettings(id), getTenantUsageSummary(id)]);

 return NextResponse.json({
 settings: {
 featureFlags: settings.featureFlags,
 sessionIdleMinutes: settings.sessionIdleMinutes,
 updatedAt: settings.updatedAt,
 },
 usage,
 });
}

export async function PATCH(request: Request, context: RouteContext) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const { id } = await context.params;
 const body = await request.json().catch(() => null);
 const parsed = patchSchema.safeParse(body);
 if (!parsed.success || !parsed.data.featureFlags) {
 return NextResponse.json({ error: "featureFlags required." }, { status: 400 });
 }

 try {
 const settings = await updateTenantFeatureFlags(
 id,
 session.user.id,
 mergeFeatureFlags(parsed.data.featureFlags),
 );
 return NextResponse.json({ settings });
 } catch (error) {
 return NextResponse.json(
 { error: error instanceof Error ? error.message : "Failed to update tenant settings." },
 { status: 500 },
 );
 }
}
