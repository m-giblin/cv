import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveProfileTenantId } from "@/lib/tenant/resolve-profile-tenant";
import { createClient } from "@/lib/supabase/server";

const postSchema = z.object({
  title: z.string().min(3),
  evidencePath: z.string().min(3).optional(),
  reflectionText: z.string().optional(),
  scenarioId: z.string().uuid().optional(),
  aiScores: z.array(z.object({ label: z.string(), score: z.number() })).optional(),
});

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

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.evidencePath && !parsed.data.evidencePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Invalid evidence path." }, { status: 403 });
  }

  const tenantId = await resolveProfileTenantId(supabase, user.id);

  const { data, error } = await supabase
    .from("pitch_practice_sessions")
    .insert({
      user_id: user.id,
      tenant_id: tenantId,
      title: parsed.data.title,
      reflection_text: parsed.data.reflectionText ?? null,
      evidence_path: parsed.data.evidencePath ?? null,
      scenario_id: parsed.data.scenarioId ?? null,
      ai_scores: parsed.data.aiScores ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    event_type: "pitch_practice_saved",
    title: `Practice saved: ${parsed.data.title}`,
    tenant_id: tenantId,
    metadata: { practiceSessionId: data.id },
  });

  return NextResponse.json({ session: data });
}
