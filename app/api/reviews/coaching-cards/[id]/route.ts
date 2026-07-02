import { NextResponse } from "next/server";
import { z } from "zod";
import { canReviewUserWork } from "@/lib/auth/can-review";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createNotification } from "@/lib/notifications/create-notification";
import {
  approvePlanStepsByType,
  rejectPlanStepsByType,
} from "@/lib/plans/complete-step";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]).default("approve"),
  managerComments: z.string().min(3),
  managerGrade: z.number().int().min(1).max(5).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await context.params;
  const parsed = reviewSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing, error: loadError } = await session.supabase
    .from("coaching_cards")
    .select("user_id, manager_review_status")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return NextResponse.json({ error: "Coaching card not found" }, { status: 404 });
  }

  if (existing.manager_review_status !== "pending") {
    return NextResponse.json({ error: "Only pending coaching cards can be reviewed." }, { status: 400 });
  }

  if (!(await canReviewUserWork(existing.user_id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const approved = parsed.data.decision === "approve";
  const reviewedAt = new Date().toISOString();

  const { data, error } = await session.supabase
    .from("coaching_cards")
    .update({
      manager_review_status: approved ? "reviewed" : "needs_revision",
      manager_comments: parsed.data.managerComments,
      manager_grade: approved ? parsed.data.managerGrade : null,
      reviewed_at: reviewedAt,
    })
    .eq("id", id)
    .select("user_id, simulation_assignment_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (approved) {
    await approvePlanStepsByType(session.supabase, {
      userId: data.user_id,
      stepType: "simulation",
      reviewerId: session.user.id,
      feedback: parsed.data.managerComments,
    });
  } else {
    await rejectPlanStepsByType(session.supabase, {
      userId: data.user_id,
      stepType: "simulation",
      reviewerId: session.user.id,
      feedback: parsed.data.managerComments,
    });

    if (data.simulation_assignment_id) {
      await session.supabase
        .from("simulation_assignments")
        .update({ status: "in_progress" })
        .eq("id", data.simulation_assignment_id);
    }
  }

  await session.supabase.from("activity_logs").insert({
    user_id: data.user_id,
    actor_id: session.user.id,
    event_type: "coaching_card_reviewed",
    title: approved ? "Manager approved simulation" : "Manager requested simulation redo",
    metadata: { coachingCardId: id, decision: parsed.data.decision },
  });

  await createNotification(session.supabase, {
    userId: data.user_id,
    title: approved ? "Simulation approved" : "Simulation needs revision",
    body: parsed.data.managerComments,
    actionUrl: approved ? "/feedback" : "/simulations?focus=simulation",
  });

  return NextResponse.json({ success: true });
}
