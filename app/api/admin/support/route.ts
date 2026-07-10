import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { notifySuperAdminsOfNewTicket } from "@/lib/platform/notify-support";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getTenantById } from "@/lib/tenant/tenants";
import { createSupportRequest, listSupportRequests } from "@/lib/tenant/support-requests";

export async function GET() {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) return session;

 const tickets = await listSupportRequests({ tenantId: session.tenantId, limit: 50 });
 return NextResponse.json({ tickets });
}

const createSchema = z.object({
 subject: z.string().min(3).max(200),
 body: z.string().min(10).max(10000),
 priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
 pageUrl: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) return session;

 const parsed = createSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 try {
 const ticket = await createSupportRequest({
 tenantId: session.tenantId,
 reporterId: session.user.id,
 subject: parsed.data.subject,
 body: parsed.data.body,
 priority: parsed.data.priority,
 pageUrl: parsed.data.pageUrl ?? null,
 });

 const tenant = await getTenantById(session.tenantId);
 await notifySuperAdminsOfNewTicket({ ...ticket, tenantName: tenant?.name });

 await logAuditEvent(session.user.id, {
 action: "support.request_created",
 targetType: "support_request",
 targetId: ticket.id,
 tenantId: session.tenantId,
 details: { subject: ticket.subject, priority: ticket.priority },
 });

 return NextResponse.json({ ticket }, { status: 201 });
 } catch (error) {
 return NextResponse.json(
 { error: error instanceof Error ? error.message : "Failed to submit request." },
 { status: 500 },
 );
 }
}
