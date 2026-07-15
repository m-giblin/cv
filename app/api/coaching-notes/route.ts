import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getDashboardData } from "@/lib/data/get-dashboard-data";

const postSchema = z.object({
  seId: z.string().uuid(),
  note: z.string().min(1).max(8000),
  sessionFocus: z.string().max(200).optional(),
  outcomeLabel: z.string().max(40).optional(),
});

export async function GET(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const seId = new URL(request.url).searchParams.get("seId");
  if (!seId) {
    return NextResponse.json({ error: "seId required" }, { status: 400 });
  }

  const { data: dashboard } = await getDashboardData();
  const orgIds = new Set(dashboard.myOrg.map((profile) => profile.id));
  if (!orgIds.has(seId) && dashboard.currentUser.role !== "admin" && dashboard.currentUser.role !== "director") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await session.supabase
    .from("manager_coaching_session_notes")
    .select("id, session_focus, note, outcome_label, created_at")
    .eq("se_user_id", seId)
    .eq("manager_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: dashboard } = await getDashboardData();
  const orgIds = new Set(dashboard.myOrg.map((profile) => profile.id));
  if (!orgIds.has(parsed.data.seId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await session.supabase
    .from("manager_coaching_session_notes")
    .insert({
      tenant_id: session.tenantId,
      manager_id: session.user.id,
      se_user_id: parsed.data.seId,
      note: parsed.data.note.trim(),
      session_focus: parsed.data.sessionFocus?.trim() || "Coaching note",
      outcome_label: parsed.data.outcomeLabel ?? "LOGGED",
    })
    .select("id, session_focus, note, outcome_label, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data }, { status: 201 });
}
