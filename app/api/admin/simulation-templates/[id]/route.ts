import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertTenantOwnedRow, tenantTable } from "@/lib/data/tenant-scoped-query";

const schema = z.object({
 name: z.string().min(3),
 persona: z.string().min(3),
 vertical: z.string().min(2),
 solutionFocus: z.string().min(2),
 promptBody: z.string().min(20),
 difficulty: z.enum(["foundational", "intermediate", "advanced"]).optional(),
 practiceRoundsBeforeSubmit: z.number().int().min(0).max(10).optional(),
});

export async function PATCH(
 request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const scoped = tenantTable(session.tenantId);
 if (!scoped) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const { id } = await context.params;
 const parsed = schema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const owned = await assertTenantOwnedRow(session.tenantId, "simulation_templates", id);
 if (!owned) {
 return NextResponse.json({ error: "Template not found." }, { status: 404 });
 }

 const { error } = await scoped
 .from("simulation_templates")
 .update({
 name: parsed.data.name,
 persona: parsed.data.persona,
 vertical: parsed.data.vertical,
 solution_focus: parsed.data.solutionFocus,
 difficulty: parsed.data.difficulty ?? "intermediate",
 prompt_body: parsed.data.promptBody,
 practice_rounds_before_submit: parsed.data.practiceRoundsBeforeSubmit ?? 1,
 })
 .eq("id", id)
 .eq("tenant_id", session.tenantId);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 auditMutation(session.user.id, "simulation_template.updated", "simulation_template", id, {
 name: parsed.data.name,
 }, session.tenantId);

 return NextResponse.json({ success: true });
}

export async function DELETE(
 _request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const scoped = tenantTable(session.tenantId);
 if (!scoped) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const { id } = await context.params;

 const owned = await assertTenantOwnedRow(session.tenantId, "simulation_templates", id);
 if (!owned) {
 return NextResponse.json({ error: "Template not found." }, { status: 404 });
 }

 const { error } = await scoped.from("simulation_templates").delete().eq("id", id).eq("tenant_id" as never, session.tenantId);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 auditMutation(session.user.id, "simulation_template.deleted", "simulation_template", id, undefined, session.tenantId);

 return NextResponse.json({ success: true });
}
