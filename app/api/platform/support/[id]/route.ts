import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { notifyReporterOfTicketUpdate } from "@/lib/platform/notify-support";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { updateSupportRequest } from "@/lib/tenant/support-requests";

const patchSchema = z.object({
 status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
 operatorNotes: z.string().max(5000).nullable().optional(),
 operatorReply: z.string().max(5000).nullable().optional(),
 assignedTo: z.string().uuid().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const { id } = await context.params;
 const parsed = patchSchema.safeParse(await request.json().catch(() => null));
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 try {
 const ticket = await updateSupportRequest(id, {
 status: parsed.data.status,
 operatorNotes: parsed.data.operatorNotes,
 operatorReply: parsed.data.operatorReply,
 assignedTo: parsed.data.assignedTo,
 resolvedBy: session.user.id,
 setFirstResponse: Boolean(parsed.data.operatorReply || parsed.data.status === "in_progress"),
 });

 await notifyReporterOfTicketUpdate(ticket, {
 status: parsed.data.status,
 operatorReply: parsed.data.operatorReply,
 });

 await logAuditEvent(session.user.id, {
 action: "support.request_updated",
 targetType: "support_request",
 targetId: id,
 tenantId: ticket.tenantId,
 details: parsed.data,
 });

 return NextResponse.json({ ticket });
 } catch (error) {
 return NextResponse.json(
 { error: error instanceof Error ? error.message : "Failed to update ticket." },
 { status: 500 },
 );
 }
}
