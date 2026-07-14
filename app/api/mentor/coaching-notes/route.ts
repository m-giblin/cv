import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const putSchema = z.object({
  seUserId: z.string().uuid(),
  notes: z.string().max(8000),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seUserId = new URL(request.url).searchParams.get("seUserId");
  if (!seUserId) {
    return NextResponse.json({ error: "seUserId required" }, { status: 400 });
  }

  const { data } = await supabase
    .from("mentor_coaching_notes")
    .select("notes, updated_at")
    .eq("mentor_id", user.id)
    .eq("se_user_id", seUserId)
    .maybeSingle();

  return NextResponse.json({
    notes: data?.notes ?? "",
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = putSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: assignment } = await supabase
    .from("plan_assignments")
    .select("id")
    .eq("user_id", parsed.data.seUserId)
    .eq("mentor_id", user.id)
    .neq("status", "completed")
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: "You are not the assigned mentor for this SE." }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("mentor_coaching_notes").upsert(
    {
      mentor_id: user.id,
      se_user_id: parsed.data.seUserId,
      tenant_id: (profile as { tenant_id?: string | null } | null)?.tenant_id ?? null,
      notes: parsed.data.notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "mentor_id,se_user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
