import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";

/** Resolve a score-dispute flag. */
export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;

  const { error } = await session.supabase
    .from("readiness_signal_flags")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: session.user.id })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
