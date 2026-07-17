import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { getOperatorNotificationPrefs, updateOperatorNotificationPrefs } from "@/lib/platform/operator-prefs";

const putSchema = z.object({
  emailOnCriticalSupport: z.boolean().optional(),
  emailOnNewTenant: z.boolean().optional(),
  emailDigestHours: z.number().int().min(1).max(168).optional(),
  channels: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const prefs = await getOperatorNotificationPrefs(session.user.id);
  return NextResponse.json({ prefs });
}

export async function PUT(request: Request) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid notification preferences payload." }, { status: 400 });
  }

  try {
    const prefs = await updateOperatorNotificationPrefs(session.user.id, parsed.data);
    return NextResponse.json({ prefs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update notification preferences." },
      { status: 500 },
    );
  }
}
