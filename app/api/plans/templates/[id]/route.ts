import { NextResponse } from "next/server";
import { persistedStepType } from "@/lib/admin/plan-builder";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { assertTenantOwnedRow, getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { builderMetadata } from "@/lib/plans/builder-metadata";
import { templateRequestError, updateTemplateSchema, type TemplateStepInput } from "@/lib/plans/template-step-schema";
import { canEditTemplateStructure, isLockedTemplate } from "@/lib/plans/template-lock";

type RouteContext = { params: Promise<{ id: string }> };

function stepRow(
 planId: string,
 tenantId: string,
 step: TemplateStepInput,
 sortOrder: number,
) {
 return {
 plan_id: planId,
 tenant_id: tenantId,
 title: step.title,
 description: step.description ?? null,
 step_type: persistedStepType(step.stepType),
 sort_order: sortOrder,
 content_url: step.contentUrl || null,
 content_asset_id: step.contentAssetId || null,
 challenge_id: step.challengeId || null,
 simulation_template_id: step.simulationTemplateId || null,
 metadata: {
 dueOffsetDays: step.dueOffsetDays ?? sortOrder * 7,
 segmentIndex: step.segmentIndex ?? null,
 isSegmentGate: step.isSegmentGate ?? false,
 ...builderMetadata(step),
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
 return NextResponse.json({ error: templateRequestError(parsed.error) }, { status: 400 });
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

 const { error: updateError } = await admin
 .from("onboarding_plans")
 .update({
 name: parsed.data.name,
 description: parsed.data.description ?? null,
 })
 .eq("id", id)
 .eq("tenant_id", session.tenantId);

 if (updateError) {
 return NextResponse.json({ error: updateError.message }, { status: 500 });
 }

 const { data: existingSteps, error: stepsFetchError } = await admin
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
 const { data: referenced } = await admin
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

 const { error: deleteError } = await admin.from("plan_steps").delete().in("id", toRemove).eq("tenant_id", session.tenantId);

 if (deleteError) {
 return NextResponse.json({ error: deleteError.message }, { status: 500 });
 }
 }

 for (const [index, step] of parsed.data.steps.entries()) {
 const sortOrder = index + 1;
 const row = stepRow(id, session.tenantId, step, sortOrder);

 if (step.id && existingIds.has(step.id)) {
 const { error } = await admin.from("plan_steps").update(row).eq("id", step.id).eq("tenant_id", session.tenantId);

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
 const { error } = await admin.from("plan_steps").insert(row);

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
