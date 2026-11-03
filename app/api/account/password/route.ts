import { NextResponse } from "next/server";
import { z } from "zod";
import { completePasswordChange } from "@/lib/auth/account-access-server";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ password: z.string().min(1).max(200) });

/**
 * Sets the signed-in person's password and lifts the "replace your temporary password" block.
 * Middleware only lets a fully verified (MFA) session reach this.
 */
export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a new password." }, { status: 400 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Password changes aren't available right now." }, { status: 503 });
  const result = await completePasswordChange(admin, session.user.id, parsed.data.password);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
