import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  status: z.enum(["reviewed", "rejected"]),
  managerFeedback: z.string().optional(),
  managerGrade: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = await supabase.from("pitch_submissions").select("user_id").eq("id", id).maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: reviewer } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const canReview =
    reviewer?.role && ["manager", "mentor", "director", "admin"].includes(reviewer.role);

  if (!canReview) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("pitch_submissions")
    .update({
      status: parsed.data.status,
      manager_feedback: parsed.data.managerFeedback ?? null,
      manager_grade: parsed.data.managerGrade ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (parsed.data.status === "reviewed") {
    await supabase.from("gamification_events").insert({
      user_id: existing.user_id,
      event_type: "pitch_approved",
      points: (parsed.data.managerGrade ?? 4) * 5,
      metadata: { pitchId: id, grade: parsed.data.managerGrade },
    });
  }

  return NextResponse.json({ success: true });
}
