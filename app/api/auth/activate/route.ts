import { NextResponse } from "next/server";
import { z } from "zod";
import { redeemActivationCode } from "@/lib/auth/account-access-server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.string().email().max(320),
  code: z.string().min(4).max(32),
  password: z.string().min(1).max(200),
});

/** Public: a new person sets their own password with the activation code their admin gave them. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your email, the code and a new password." }, { status: 400 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Activation isn't available right now." }, { status: 503 });
  const result = await redeemActivationCode(admin, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
