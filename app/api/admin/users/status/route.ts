import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  /** activate / deactivate change status; invite sends the set-your-password email to active people. */
  action: z.enum(["activate", "deactivate", "invite"]),
});

/** Bulk actions on the People list: activate, deactivate, or send invites. */
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role key required." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick at least one person." }, { status: 400 });
  const { ids, action } = parsed.data;

  // Only people in this workspace, and never yourself (so you can't lock yourself out).
  const { data } = await admin.from("profiles").select("id, email, status").eq("tenant_id", session.tenantId!).in("id", ids);
  const people = ((data ?? []) as { id: string; email: string; status: string }[]).filter((person) => person.id !== session.user.id);
  if (!people.length) return NextResponse.json({ error: "None of those people are in this workspace." }, { status: 404 });
  const now = new Date().toISOString();

  if (action !== "invite") {
    const { error } = await admin
      .from("profiles")
      .update({ status: action === "activate" ? "active" : "inactive", updated_at: now } as never)
      .in(
        "id",
        people.map((person) => person.id),
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logAuditEvent(session.user.id, {
      action: action === "activate" ? "user.activated" : "user.deactivated",
      targetType: "profile",
      tenantId: session.tenantId,
      details: { count: people.length },
    });
    return NextResponse.json({ updated: people.length });
  }

  // Invites go only to active people: an inactive account couldn't sign in anyway.
  const active = people.filter((person) => person.status !== "inactive");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let sent = 0;
  const failed: string[] = [];
  for (const person of active) {
    const { error } = await admin.auth.resetPasswordForEmail(person.email, { redirectTo: `${siteUrl}/auth/reset-password` });
    if (error) failed.push(person.email);
    else {
      sent += 1;
      await admin.from("profiles").update({ invited_at: now } as never).eq("id", person.id);
    }
  }
  await logAuditEvent(session.user.id, { action: "user.invited", targetType: "profile", tenantId: session.tenantId, details: { count: sent } });
  return NextResponse.json({ sent, skippedInactive: people.length - active.length, failed });
}
