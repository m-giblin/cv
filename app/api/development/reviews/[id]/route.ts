import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";

const updateSchema = z.object({
  seEvidence: z.string().min(10).optional(),
  seEvidenceUrl: z.string().url().optional().or(z.literal("")),
  managerComments: z.string().min(3).optional(),
  status: z.enum(["not_started", "on_track", "at_risk", "achieved"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
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
  const parsed = updateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: review } = await supabase
    .from("goal_quarterly_reviews")
    .select("id, goal_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  const { data: goal } = await supabase
    .from("development_goals")
    .select("id, plan_id, title")
    .eq("id", review.goal_id)
    .maybeSingle();

  if (!goal) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }

  const { data: plan } = await supabase
    .from("development_plans")
    .select("user_id, manager_id")
    .eq("id", goal.plan_id)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const isSe = plan.user_id === user.id;
  const isManager = plan.manager_id === user.id;

  if (!isSe && !isManager) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isAdmin = profile?.role === "admin" || profile?.role === "director";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const update: Database["public"]["Tables"]["goal_quarterly_reviews"]["Update"] = {};

  if (isSe) {
    if (parsed.data.seEvidence) update.se_evidence = parsed.data.seEvidence;
    if (parsed.data.seEvidenceUrl !== undefined) update.se_evidence_url = parsed.data.seEvidenceUrl || null;
    if (parsed.data.status && parsed.data.status !== "achieved") update.status = parsed.data.status;
  }

  if (isManager || !isSe) {
    if (parsed.data.managerComments) update.manager_comments = parsed.data.managerComments;
    if (parsed.data.status) {
      update.status = parsed.data.status;
      update.reviewed_at = new Date().toISOString();
      update.reviewed_by = user.id;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { error } = await supabase.from("goal_quarterly_reviews").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (parsed.data.status && isManager) {
    await supabase
      .from("development_goals")
      .update({ overall_status: parsed.data.status })
      .eq("id", goal.id);

    await supabase.from("notifications").insert({
      user_id: plan.user_id,
      title: `${goal.title} — ${parsed.data.status.replaceAll("_", " ")}`,
      body: parsed.data.managerComments ?? "Your manager reviewed a quarterly goal checkpoint.",
    });
  }

  auditMutation(user.id, "development_review.updated", "goal_quarterly_review", id, {
    userId: plan.user_id,
    status: parsed.data.status,
  });

  return NextResponse.json({ success: true });
}
