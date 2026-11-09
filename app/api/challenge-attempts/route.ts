import { NextResponse } from "next/server";
import { z } from "zod";
import { startBlockedReason } from "@/lib/challenges/attempt-clock";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const startSchema = z.object({ challengeId: z.string().uuid() });

/** The signed-in person's latest attempt at each challenge, and who reviews their work. */
export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ attempts: [], hasManager: false, managerName: null });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("challenge_attempts")
      .select("id, challenge_id, status, clock_started_at, restart_allowed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("manager_id").eq("id", user.id).maybeSingle(),
  ]);

  const latest = new Map<string, NonNullable<typeof rows>[number]>();
  for (const row of rows ?? []) {
    if (!latest.has(row.challenge_id)) latest.set(row.challenge_id, row);
  }

  const managerId = profile?.manager_id ?? null;
  const { data: manager } = managerId
    ? await supabase.from("profiles").select("full_name").eq("id", managerId).maybeSingle()
    : { data: null };

  return NextResponse.json({
    attempts: [...latest.values()],
    hasManager: Boolean(managerId),
    managerName: manager?.full_name ?? null,
  });
}

/** Starts the 5-working-day clock on a challenge. Pressing Start twice returns the same attempt. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = startSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { challengeId } = parsed.data;

  // Read as the signed-in user so RLS limits this to challenges in their workspace.
  const [{ data: challenge }, { data: profile }, { data: latest }] = await Promise.all([
    supabase.from("challenges").select("id").eq("id", challengeId).maybeSingle(),
    supabase.from("profiles").select("manager_id, tenant_id").eq("id", user.id).maybeSingle(),
    admin
      .from("challenge_attempts")
      .select("id, status, restart_allowed_at, clock_started_at")
      .eq("user_id", user.id)
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  if (latest?.status === "active" || latest?.status === "submitted") {
    return NextResponse.json({ attempt: latest });
  }
  if (!profile?.manager_id) {
    return NextResponse.json(
      { error: "You need a manager to review this. Contact your admin to have one assigned." },
      { status: 409 },
    );
  }
  const blocked = startBlockedReason(latest);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });

  const { data: attempt, error } = await admin
    .from("challenge_attempts")
    .insert({ user_id: user.id, challenge_id: challengeId, tenant_id: profile.tenant_id })
    .select("id, status, restart_allowed_at, clock_started_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === "23505" ? 409 : 500 });
  }

  await admin.from("activity_logs").insert({
    user_id: user.id,
    actor_id: user.id,
    event_type: "challenge_started",
    title: "Challenge started",
    tenant_id: profile.tenant_id,
    metadata: { attemptId: attempt.id, challengeId },
  });

  return NextResponse.json({ attempt }, { status: 201 });
}
