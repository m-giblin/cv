import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { assertTenantOwnedRow, getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { canEditTemplateStructure, isLockedTemplate } from "@/lib/plans/template-lock";

const stepSchema = z.object({
 id: z.string().uuid().optional(),
 title: z.string().min(2),
 description: z.string().optional(),
 stepType: z.enum([
 "content_review",
 "challenge",
 "simulation",
 "deal_prep",
 "shadow_meeting_log",
 "mentor_review",
 "custom",
 ]),
 dueOffsetDays: z.number().int().min(1).optional(),
 contentUrl: z.string().url().optional().or(z.literal("")),
 contentAssetId: z.string().uuid().optional().or(z.literal("")),
 challengeId: z.string().uuid().optional().or(z.literal("")),
 simulationTemplateId: z.string().uuid().optional().or(z.literal("")),
 segmentIndex: z.number().int().min(1).max(4).nullable().optional(),
 isSegmentGate: z.boolean().optional(),
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
 metadata: {
 dueOffsetDays: step.dueOffsetDays ?? sortOrder * 7,
 segmentIndex: step.segmentIndex ?? null,
 isSegmentGate: step.isSegmentGate ?? false,
 },
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

 const owned = await assertTenantOwnedRow(session.tenantId, "onboarding_plans", id);
 if (!owned) {
 return NextResponse.json({ error: "Template not found." }, { status: 404 });
 }

 const admin = getTenantAdminClient();
 if (!admin) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const { data: plan, error: planError } = await admin
 .from("onboarding_plans")
 .select("id, name, is_locked")
 .eq("id", id)
 .eq("is_template", true)
 .eq("tenant_id", session.tenantId)
 .maybeSingle();

 if (planError || !plan) {
 return NextResponse.json({ error: "Template not found." }, { status: 404 });
 }

 const locked = isLockedTemplate(plan);
 const canEditStructure = canEditTemplateStructure(session.role, locked);

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

 if (locked && !canEditStructure) {
 if (payloadIds.size !== existingIds.size || [...payloadIds].some((stepId) => !existingIds.has(stepId))) {
 return NextResponse.json(
 { error: "Locked plans cannot have steps added or removed. Reorder only, or contact an Admin." },
 { status: 403 },
 );
 }
 }

 const toRemove = [...existingIds].filter((stepId) => !payloadIds.has(stepId));

 if (toRemove.length > 0 && locked && !canEditStructure) {
 return NextResponse.json(
 { error: "Locked plans cannot have steps deleted. Contact an Admin." },
 { status: 403 },
 );
 }

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
 if (locked && !canEditStructure) {
 return NextResponse.json(
 { error: "Locked plans cannot have steps added. Contact an Admin." },
 { status: 403 },
 );
 }
 const { error } = await session.supabase.from("plan_steps").insert(row);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }
 }
 }

 await logAuditEvent(session.user.id, {
 action: "plan.template_updated",
 targetType: "onboarding_plan",
 targetId: id,
 tenantId: session.tenantId,
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

 const owned = await assertTenantOwnedRow(session.tenantId, "onboarding_plans", id);
 if (!owned) {
 return NextResponse.json({ error: "Template not found." }, { status: 404 });
 }

 const admin = getTenantAdminClient();
 if (!admin) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const { count } = await admin
 .from("plan_assignments")
 .select("id", { count: "exact", head: true })
 .eq("plan_id", id);

 if ((count ?? 0) > 0) {
 return NextResponse.json(
 { error: "Cannot delete a template that has active assignments." },
 { status: 400 },
 );
 }

 const { data: planRow } = await admin
 .from("onboarding_plans")
 .select("is_locked, name")
 .eq("id", id)
 .maybeSingle();

 if (isLockedTemplate(planRow ?? { name: "", is_locked: false }) && !canEditTemplateStructure(session.role, true)) {
 return NextResponse.json({ error: "Locked templates cannot be deleted. Contact an Admin." }, { status: 403 });
 }

 await admin.from("plan_steps").delete().eq("plan_id", id).eq("tenant_id", session.tenantId);

 const { error } = await admin
 .from("onboarding_plans")
 .delete()
 .eq("id", id)
 .eq("is_template", true)
 .eq("tenant_id", session.tenantId);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 await logAuditEvent(session.user.id, {
 action: "plan.template_deleted",
 targetType: "onboarding_plan",
 targetId: id,
 tenantId: session.tenantId,
 });

 return NextResponse.json({ success: true });
}
