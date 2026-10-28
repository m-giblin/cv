import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { listShared, loadShared } from "@/lib/mentoring/shared-practice";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * ?assignment=<mentee's plan assignment>: what the mentee shared with their mentor from free practice.
 * Add &item=<ref> for one item in full. Only the mentor on that assignment can read it.
 */
export async function GET(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const params = new URL(request.url).searchParams;
  const admin = createAdminClient() as unknown as SupabaseClient | null;
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: assignment } = await admin
    .from("plan_assignments")
    .select("user_id, mentor_id")
    .eq("id", params.get("assignment") ?? "")
    .maybeSingle();
  if (!assignment || assignment.mentor_id !== session.user.id) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const items = await listShared(admin, assignment.user_id as string, session.user.id);
  const ref = params.get("item");
  if (!ref) return NextResponse.json({ items });
  const item = items.find((entry) => entry.ref === ref);
  const detail = item ? await loadShared(admin, assignment.user_id as string, item) : null;
  if (!detail) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ detail });
}
