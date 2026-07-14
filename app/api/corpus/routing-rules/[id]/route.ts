import { NextResponse } from "next/server";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertTenantOwnedRow, tenantTable } from "@/lib/data/tenant-scoped-query";

export async function DELETE(
 _request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) return session;

 const scoped = tenantTable(session.tenantId);
 if (!scoped) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const { id } = await context.params;

 const owned = await assertTenantOwnedRow(session.tenantId, "corpus_routing_rules", id);
 if (!owned) {
 return NextResponse.json({ error: "Rule not found." }, { status: 404 });
 }

 const { error } = await scoped.from("corpus_routing_rules").delete().eq("id", id).eq("tenant_id", session.tenantId);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 auditMutation(session.user.id, "corpus.routing_rule.deleted", "corpus_routing_rule", id, undefined, session.tenantId);

 return NextResponse.json({ success: true });
}
