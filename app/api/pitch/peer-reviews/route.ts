import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  pitchId: z.string().uuid(),
  clarityScore: z.number().int().min(1).max(5),
  storylineScore: z.number().int().min(1).max(5),
  differentiationScore: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  endorsed: z.boolean().default(false),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ reviews: [] });
  }

  const url = new URL(request.url);
  const pitchId = url.searchParams.get("pitchId");

  let query = supabase.from("pitch_peer_reviews").select("*").order("created_at", { ascending: false });

  if (pitchId) {
    query = query.eq("pitch_id", pitchId);
  }

  const { data, error } = await query.limit(50);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reviewerIds = [...new Set((data ?? []).map((row) => row.reviewer_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, role").in("id", reviewerIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const reviews = (data ?? []).map((row) => ({
    ...row,
    reviewerName: profileById.get(row.reviewer_id)?.full_name ?? "Teammate",
    reviewerRole: profileById.get(row.reviewer_id)?.role ?? "se",
  }));

  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
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

  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pitch_peer_reviews")
    .upsert(
      {
        pitch_id: parsed.data.pitchId,
        reviewer_id: user.id,
        clarity_score: parsed.data.clarityScore,
        storyline_score: parsed.data.storylineScore,
        differentiation_score: parsed.data.differentiationScore,
        comment: parsed.data.comment ?? null,
        endorsed: parsed.data.endorsed,
      },
      { onConflict: "pitch_id,reviewer_id" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("gamification_events").insert({
    user_id: user.id,
    event_type: "pitch_peer_review",
    points: parsed.data.endorsed ? 15 : 8,
    metadata: { pitchId: parsed.data.pitchId },
  });

  return NextResponse.json({ review: data });
}
