import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { requireManagerSession } from "@/lib/auth/require-manager";

const stepSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  stepType: z.enum([
    "content_review",
    "challenge",
    "simulation",
    "shadow_meeting_log",
    "mentor_review",
    "custom",
  ]),
  dueOffsetDays: z.number().int().min(1).optional(),
  contentUrl: z.string().url().optional().or(z.literal("")),
  contentAssetId: z.string().uuid().optional().or(z.literal("")),
  challengeId: z.string().uuid().optional().or(z.literal("")),
  simulationTemplateId: z.string().uuid().optional().or(z.literal("")),
});

const updateTemplateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  steps: z.array(stepSchema).min(1),
});

type RouteContext = { params: Promise<{ id: string }> };

function stepRow(
  planId: string,
  step: z.infer<typeof stepSchema>,
  sortOrder: number,
) {
  return {
    plan_id: planId,
    title: step.title,
    description: step.description ?? null,
    step_type: step.stepType,
    sort_order: sortOrder,
    content_url: step.contentUrl || null,
    content_asset_id: step.contentAssetId || null,
    challenge_id: step.challengeId || null,
    simulation_template_id: step.simulationTemplateId || null,
    metadata: { dueOffsetDays: step.dueOffsetDays ?? sortOrder * 7 },
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await context.params;
  const parsed = updateTemplateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: plan, error: planError } = await session.supabase
    .from("onboarding_plans")
    .select("id")
    .eq("id", id)
    .eq("is_template", true)
    .maybeSingle();

  if (planError || !plan) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const { error: updateError } = await session.supabase
    .from("onboarding_plans")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: existingSteps, error: stepsFetchError } = await session.supabase
    .from("plan_steps")
    .select("id")
    .eq("plan_id", id);

  if (stepsFetchError) {
    return NextResponse.json({ error: stepsFetchError.message }, { status: 500 });
  }

  const existingIds = new Set((existingSteps ?? []).map((step) => step.id));
  const payloadIds = new Set(parsed.data.steps.map((step) => step.id).filter(Boolean) as string[]);
  const toRemove = [...existingIds].filter((stepId) => !payloadIds.has(stepId));

  if (toRemove.length > 0) {
    const { data: referenced } = await session.supabase
      .from("plan_assignment_steps")
      .select("plan_step_id")
      .in("plan_step_id", toRemove);

    const referencedIds = new Set((referenced ?? []).map((row) => row.plan_step_id));

    if (referencedIds.size > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot remove steps that are part of active assignments. Remove those steps from the template only after assignments complete, or keep them in the list.",
        },
        { status: 400 },
      );
    }

    const { error: deleteError } = await session.supabase.from("plan_steps").delete().in("id", toRemove);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  for (const [index, step] of parsed.data.steps.entries()) {
    const sortOrder = index + 1;
    const row = stepRow(id, step, sortOrder);

    if (step.id && existingIds.has(step.id)) {
      const { error } = await session.supabase.from("plan_steps").update(row).eq("id", step.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await session.supabase.from("plan_steps").insert(row);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  await logAuditEvent(session.supabase, {
    action: "plan.template_updated",
    targetType: "onboarding_plan",
    targetId: id,
    details: { name: parsed.data.name, stepCount: parsed.data.steps.length },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await context.params;

  const { count } = await session.supabase
    .from("plan_assignments")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Cannot delete a template that has active assignments." },
      { status: 400 },
    );
  }

  await session.supabase.from("plan_steps").delete().eq("plan_id", id);

  const { error } = await session.supabase.from("onboarding_plans").delete().eq("id", id).eq("is_template", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(session.supabase, {
    action: "plan.template_deleted",
    targetType: "onboarding_plan",
    targetId: id,
  });

  return NextResponse.json({ success: true });
}
