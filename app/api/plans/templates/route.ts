import { NextResponse } from "next/server";
import { persistedStepType } from "@/lib/admin/plan-builder";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { builderMetadata } from "@/lib/plans/builder-metadata";
import { createTemplateSchema, templateRequestError } from "@/lib/plans/template-step-schema";

export async function GET() {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const admin = getTenantAdminClient();
 if (!admin) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const { data: templates, error } = await admin
 .from("onboarding_plans")
 .select("id, name, description, is_template, is_locked, created_at")
 .eq("is_template", true)
 .eq("tenant_id", session.tenantId)
 .eq("is_archived", false)
 .order("name");

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const templateIds = (templates ?? []).map((t) => t.id);

 const { data: steps } =
 templateIds.length > 0
 ? await admin
 .from("plan_steps")
 .select("*")
 .in("plan_id", templateIds)
 .eq("tenant_id", session.tenantId)
 .order("sort_order")
 : { data: [] };

 return NextResponse.json({
 templates: (templates ?? []).map((template) => ({
 ...template,
 steps: (steps ?? []).filter((step) => step.plan_id === template.id),
 })),
 });
}

export async function POST(request: Request) {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const parsed = createTemplateSchema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: templateRequestError(parsed.error) }, { status: 400 });
 }

 const admin = getTenantAdminClient();
 if (!admin) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const { data: plan, error: planError } = await admin
 .from("onboarding_plans")
 .insert({
 name: parsed.data.name,
 description: parsed.data.description ?? null,
 is_template: true,
 is_locked: false,
 created_by: session.user.id,
 tenant_id: session.tenantId,
 } as never)
 .select("id")
 .single();

 if (planError) {
 return NextResponse.json({ error: planError.message }, { status: 500 });
 }

 const stepRows = parsed.data.steps.map((step, index) => ({
 plan_id: plan.id,
 title: step.title,
 description: step.description ?? null,
 step_type: persistedStepType(step.stepType),
 sort_order: index + 1,
 content_url: step.contentUrl || null,
 content_asset_id: step.contentAssetId || null,
 challenge_id: step.challengeId || null,
 simulation_template_id: step.simulationTemplateId || null,
 tenant_id: session.tenantId,
 metadata: {
 dueOffsetDays: step.dueOffsetDays ?? (index + 1) * 7,
 segmentIndex: step.segmentIndex ?? null,
 isSegmentGate: step.isSegmentGate ?? false,
 ...builderMetadata(step),
 },
 }));

 const { error: stepsError } = await admin.from("plan_steps").insert(stepRows as never);

 if (stepsError) {
 await admin.from("onboarding_plans").delete().eq("id", plan.id).eq("tenant_id", session.tenantId);
 return NextResponse.json({ error: stepsError.message }, { status: 500 });
 }

 await logAuditEvent(session.user.id, {
 action: "plan.template_created",
 targetType: "onboarding_plan",
 targetId: plan.id,
 tenantId: session.tenantId,
 details: { name: parsed.data.name, stepCount: parsed.data.steps.length },
 });

 return NextResponse.json({ id: plan.id });
}
