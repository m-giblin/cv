import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { createNotification } from "@/lib/notifications/create-notification";

/** The assignee marks a Learn library item done (or not done). Only their own assignments. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = z.object({ done: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = getTenantAdminClient() as unknown as SupabaseClient | null;
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const { data } = await admin
    .from("content_assignments")
    .select("id, assigned_to, assigned_by, asset_id, status")
    .eq("id", id)
    .maybeSingle();
  const row = data as { id: string; assigned_to: string; assigned_by: string | null; asset_id: string; status: string } | null;
  if (!row || row.assigned_to !== session.user.id || row.status === "cancelled") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("content_assignments")
    .update(parsed.data.done ? { status: "completed", completed_at: now, updated_at: now } : { status: "assigned", completed_at: null, updated_at: now })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 500 });

  if (parsed.data.done && row.assigned_by && row.status !== "completed") {
    const [{ data: me }, { data: asset }] = await Promise.all([
      admin.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle(),
      admin.from("content_assets").select("title").eq("id", row.asset_id).maybeSingle(),
    ]);
    await createNotification(admin as never, {
      userId: row.assigned_by,
      title: `${(me as { full_name?: string } | null)?.full_name ?? "Someone"} finished ${(asset as { title?: string } | null)?.title ?? "a library item"}`,
      body: "Marked done from their assigned training.",
      actionUrl: `/manager?profile=${session.user.id}`,
    }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
