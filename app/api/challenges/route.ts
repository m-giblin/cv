import { NextResponse } from "next/server";
import { generatedChallengeSchema } from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  const { data, error } = await supabase.from("challenges").select("id, title").order("title");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ challenges: data ?? [] });
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

  const parsed = generatedChallengeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const challenge = parsed.data;

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      title: challenge.title,
      description: challenge.description,
      steps: challenge.steps,
      success_criteria: challenge.successCriteria,
      linked_solutions: challenge.linkedSolutions,
      difficulty: challenge.difficulty,
      estimated_minutes: challenge.estimatedMinutes,
      is_ai_generated: true,
      created_by: user.id,
      ai_metadata: { linkedResources: challenge.linkedResources },
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
