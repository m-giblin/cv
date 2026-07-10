import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertTenantOwnedRow, tenantTable } from "@/lib/data/tenant-scoped-query";

const ruleSchema = z.object({
 tag: z.string().min(2).max(80),
 destinationType: z.enum(["slack", "email"]),
 destinationAddress: z.string().min(3).max(200),
 label: z.string().max(120).optional(),
});

export async function GET() {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) return session;

 const scoped = tenantTable(session.tenantId);
 if (!scoped) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const { data, error } = await scoped.select("corpus_routing_rules", "*").order("tag");

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({ rules: data ?? [] });
}

export async function POST(request: Request) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) return session;

 const scoped = tenantTable(session.tenantId);
 if (!scoped) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const parsed = ruleSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { data: created, error } = await scoped.from("corpus_routing_rules").insert({
 tag: parsed.data.tag,
 destination_type: parsed.data.destinationType,
 destination_address: parsed.data.destinationAddress,
 label: parsed.data.label ?? null,
 created_by: session.user.id,
 tenant_id: session.tenantId,
 } as never).select("id").single();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 auditMutation(
 session.user.id,
 "corpus.routing_rule.created",
 "corpus_routing_rule",
 created.id,
 parsed.data,
 session.tenantId,
 );

 return NextResponse.json({ success: true, id: created.id });
}
