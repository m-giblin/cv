import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ pitches: [] });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile?.role || !["manager", "mentor", "director", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: reports } = await supabase.from("profiles").select("id, full_name").eq("manager_id", user.id);
  const orgIds = (reports ?? []).map((row) => row.id);
  if (orgIds.length === 0) {
    return NextResponse.json({ pitches: [] });
  }

  const { data: rows } = await supabase
    .from("pitch_submissions")
    .select("id, user_id, title, reflection_text, created_at")
    .in("user_id", orgIds)
    .eq("status", "submitted")
    .order("created_at", { ascending: false });

  const nameById = new Map((reports ?? []).map((p) => [p.id, p.full_name]));

  return NextResponse.json({
    pitches: (rows ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      personName: nameById.get(row.user_id) ?? "Team member",
      title: row.title,
      reflectionText: row.reflection_text,
      createdAt: row.created_at,
    })),
  });
}
