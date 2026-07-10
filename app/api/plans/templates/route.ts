import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";

const stepSchema = z.object({
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

const createTemplateSchema = z.object({
 name: z.string().min(3),
 description: z.string().optional(),
 steps: z.array(stepSchema).min(1),
});

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
 .select("id, name, description, is_template, created_at")
 .eq("is_template", true)
 .eq("tenant_id", session.tenantId)
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
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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
 step_type: step.stepType,
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
