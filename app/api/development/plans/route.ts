import { NextResponse } from "next/server";
import { z } from "zod";
import { buildQuarterlyReviewsForGoal } from "@/lib/development/plan-utils";
import { canViewUserDevelopmentPlan } from "@/lib/development/authorize";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createClient } from "@/lib/supabase/server";
import { fetchDevelopmentPlans } from "@/lib/data/get-development-data";

const goalSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  competencyId: z.string().uuid().nullable().optional(),
  evidenceType: z.enum([
    "demo_recording",
    "customer_reference",
    "certification",
    "deal_support",
    "shadow_notes",
    "other",
  ]),
});

const createPlanSchema = z.object({
  userId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  managerId: z.string().uuid().nullable().optional(),
  goals: z.array(goalSchema).min(1).max(5),
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

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") ?? user.id;
  const year = url.searchParams.get("year");

  if (!(await canViewUserDevelopmentPlan(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const plans = await fetchDevelopmentPlans([userId]);
  const plan = year
    ? plans.find((item) => item.year === Number(year))
    : plans[0] ?? null;

  return NextResponse.json({ plan, plans });
}

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const parsed = createPlanSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = await session.supabase
    .from("development_plans")
    .select("id")
    .eq("user_id", parsed.data.userId)
    .eq("year", parsed.data.year)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "A development plan already exists for this year." }, { status: 400 });
  }

  const { data: profile } = await session.supabase
    .from("profiles")
    .select("manager_id")
    .eq("id", parsed.data.userId)
    .maybeSingle();

  const managerId = parsed.data.managerId ?? profile?.manager_id ?? session.user.id;

  const { data: plan, error: planError } = await session.supabase
    .from("development_plans")
    .insert({
      user_id: parsed.data.userId,
      manager_id: managerId,
      year: parsed.data.year,
      created_by: session.user.id,
    })
    .select("id")
    .single();

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 });
  }

  for (const [index, goal] of parsed.data.goals.entries()) {
    const { data: createdGoal, error: goalError } = await session.supabase
      .from("development_goals")
      .insert({
        plan_id: plan.id,
        competency_id: goal.competencyId ?? null,
        title: goal.title,
        description: goal.description ?? null,
        evidence_type: goal.evidenceType,
        sort_order: index + 1,
      })
      .select("id")
      .single();

    if (goalError) {
      return NextResponse.json({ error: goalError.message }, { status: 500 });
    }

    const reviews = buildQuarterlyReviewsForGoal(createdGoal.id, parsed.data.year);
    const { error: reviewError } = await session.supabase.from("goal_quarterly_reviews").insert(reviews);

    if (reviewError) {
      return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }
  }

  await session.supabase.from("notifications").insert({
    user_id: parsed.data.userId,
    title: `${parsed.data.year} development plan created`,
    body: "Your manager set annual goals. Open Development to review quarterly checkpoints.",
  });

  await session.supabase.from("activity_logs").insert({
    user_id: parsed.data.userId,
    actor_id: session.user.id,
    event_type: "plan_assigned",
    title: "Annual development plan created",
    metadata: { planId: plan.id, year: parsed.data.year },
  });

  return NextResponse.json({ id: plan.id });
}
