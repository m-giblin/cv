import { NextResponse } from "next/server";
import { canReviewUserWork } from "@/lib/auth/can-review";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

/** After the conversation, the manager lets someone start a canceled challenge again. */
export async function POST(_request: Request, context: RouteContext) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 503 });

  const { id } = await context.params;
  const { data: attempt } = await admin
    .from("challenge_attempts")
    .select("id, user_id, challenge_id, tenant_id, status, restart_allowed_at")
    .eq("id", id)
    .maybeSingle();

  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (!(await canReviewUserWork(attempt.user_id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (attempt.status !== "canceled") {
    return NextResponse.json({ error: "Only a canceled challenge can be restarted." }, { status: 400 });
  }
  if (attempt.restart_allowed_at) return NextResponse.json({ success: true });

  const now = new Date().toISOString();
  const { error } = await admin
    .from("challenge_attempts")
    .update({ restart_allowed_at: now, restart_allowed_by: session.user.id, updated_at: now })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("activity_logs").insert({
    user_id: attempt.user_id,
    actor_id: session.user.id,
    event_type: "challenge_restart_allowed",
    title: "Manager allowed a challenge restart",
    tenant_id: attempt.tenant_id,
    metadata: { attemptId: id, challengeId: attempt.challenge_id },
  });

  await createNotification(admin, {
    userId: attempt.user_id,
    title: "You can restart your challenge",
    body: "Your manager has allowed a restart. You'll get a new 5 working days when you press Start.",
    actionUrl: "/challenges",
  });

  return NextResponse.json({ success: true });
}
