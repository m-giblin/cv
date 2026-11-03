import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { issueActivationCode, setTemporaryPassword } from "@/lib/auth/account-access-server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ method: z.enum(["code", "password"]), password: z.string().min(1).max(200).optional() });

type RouteContext = { params: Promise<{ id: string }> };

/** Gives someone in the admin's tenant a new activation code or a temporary password, shown once. */
export async function POST(request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role key not configured." }, { status: 503 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a code or a temporary password." }, { status: 400 });

  const { data: profile } = await admin.from("profiles").select("tenant_id, email").eq("id", id).maybeSingle();
  if (!profile || profile.tenant_id !== session.tenantId) return NextResponse.json({ error: "User not found in your tenant." }, { status: 404 });
  if (id === session.user.id) return NextResponse.json({ error: "Change your own password from your account page." }, { status: 400 });

  try {
    if (parsed.data.method === "code") {
      const { code, expiresAt } = await issueActivationCode(admin, id);
      await logAuditEvent(session.user.id, { action: "user.activation_code_issued", targetType: "profile", targetId: id, tenantId: session.tenantId });
      return NextResponse.json({ activationCode: code, expiresAt });
    }
    const { password } = await setTemporaryPassword(admin, id, parsed.data.password);
    await logAuditEvent(session.user.id, { action: "user.temporary_password_set", targetType: "profile", targetId: id, tenantId: session.tenantId });
    return NextResponse.json({ temporaryPassword: password });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Couldn't update access." }, { status: 400 });
  }
}
