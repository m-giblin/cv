import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { hasStoredApiKey } from "@/lib/crypto/api-key-storage";
import { loadPlatformAiSettings, savePlatformAiSettings, toPublicAiSettings } from "@/lib/ai/settings";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  provider: z.enum(["xai", "openai"]),
  model: z.string().min(2).max(120),
  apiKey: z.string().optional().nullable(),
});

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const admin = createAdminClient();
  const settings = await loadPlatformAiSettings();

  let dbHasKey = false;
  if (admin) {
    const { data } = await admin
      .from("platform_settings")
      .select("api_key_ciphertext")
      .eq("id", "default")
      .maybeSingle();
    dbHasKey = hasStoredApiKey(data?.api_key_ciphertext);
  }

  return NextResponse.json({
    settings: toPublicAiSettings(settings, dbHasKey),
  });
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
    await savePlatformAiSettings(session.supabase, session.user.id, parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save AI settings.";
    const status = message.includes("PLATFORM_SECRETS_ENCRYPTION_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  await logAuditEvent(session.user.id, {
    action: "ai_settings.updated",
    targetType: "platform_settings",
    targetId: "default",
    details: { provider: parsed.data.provider, model: parsed.data.model, keyUpdated: Boolean(parsed.data.apiKey) },
  });

  const settings = await loadPlatformAiSettings();
  const admin = createAdminClient();
  let dbHasKey = false;
  if (admin) {
    const { data } = await admin
      .from("platform_settings")
      .select("api_key_ciphertext")
      .eq("id", "default")
      .maybeSingle();
    dbHasKey = hasStoredApiKey(data?.api_key_ciphertext);
  }

  return NextResponse.json({
    settings: toPublicAiSettings(settings, dbHasKey),
  });
}
