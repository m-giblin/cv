import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import {
  MAX_SESSION_IDLE_MINUTES,
  MIN_SESSION_IDLE_MINUTES,
  mergeFeatureFlags,
} from "@/lib/platform/settings-shared";
import { loadPlatformBasicSettings, savePlatformBasicSettings } from "@/lib/platform/settings";
import { requireAdminSession } from "@/lib/auth/require-admin";

const updateSchema = z.object({
  sessionIdleMinutes: z.number().int().min(MIN_SESSION_IDLE_MINUTES).max(MAX_SESSION_IDLE_MINUTES).optional(),
  featureFlags: z.record(z.string(), z.boolean()).optional(),
});

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const settings = await loadPlatformBasicSettings();
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

  try {
    const settings = await savePlatformBasicSettings(session.supabase, session.user.id, {
      sessionIdleMinutes: parsed.data.sessionIdleMinutes,
      featureFlags: parsed.data.featureFlags ? mergeFeatureFlags(parsed.data.featureFlags) : undefined,
    });

    await logAuditEvent(session.user.id, {
      action: "platform_settings.updated",
      targetType: "platform_settings",
      targetId: "default",
      details: {
        sessionIdleMinutes: parsed.data.sessionIdleMinutes,
        featureFlagsUpdated: Boolean(parsed.data.featureFlags),
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save platform settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
