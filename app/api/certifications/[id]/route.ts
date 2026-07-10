import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { canManageUserCertifications } from "@/lib/certifications/authorize";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createNotification } from "@/lib/notifications/create-notification";

const approveSchema = z.object({
 status: z.enum(["approved", "revoked"]),
 managerNotes: z.string().min(3).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const { id } = await context.params;
 const parsed = approveSchema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { data: existing, error: loadError } = await session.supabase
 .from("readiness_certifications")
 .select("user_id, certification_type, status")
 .eq("id", id)
 .maybeSingle();

 if (loadError || !existing) {
 return NextResponse.json({ error: "Certification not found" }, { status: 404 });
 }

 if (existing.status !== "submitted") {
 return NextResponse.json({ error: "Only submitted certifications can be reviewed." }, { status: 400 });
 }

 if (!(await canManageUserCertifications(existing.user_id))) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 const managerNotes =
 parsed.data.managerNotes ??
 (parsed.data.status === "approved" ? "Cleared for field readiness." : "Needs more evidence.");

 const { data, error } = await session.supabase
 .from("readiness_certifications")
 .update({
 status: parsed.data.status,
 manager_notes: managerNotes,
 approved_by: session.user.id,
 approved_at: new Date().toISOString(),
 })
 .eq("id", id)
 .select("user_id, certification_type")
 .single();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 await createNotification(session.supabase, {
 userId: data.user_id,
 title: parsed.data.status === "approved" ? "Certification approved" : "Certification needs more evidence",
 body: managerNotes,
 actionUrl: "/certifications",
 });

 auditMutation(session.user.id, "certification.reviewed", "readiness_certification", id, {
 status: parsed.data.status,
 userId: data.user_id,
 });

 return NextResponse.json({ success: true });
}
