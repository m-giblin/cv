import { NextResponse } from "next/server";
import { z } from "zod";
import { processReviewSignoff } from "@/lib/coaching/process-review-signoff";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  status: z.enum(["reviewed", "rejected"]),
  managerFeedback: z.string().optional(),
  managerGrade: z.number().int().min(1).max(5).optional(),
  coachingSignoff: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
 const supabase = await createClient();

 if (!supabase) {
 return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const { id } = await context.params;
 const body = (await request.json()) as Record<string, unknown>;
 const parsed = patchSchema.safeParse(body);

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const managerSession = await requireManagerSession();
 if (managerSession instanceof NextResponse) return managerSession;

 const { data: existing } = await managerSession.supabase
 .from("pitch_submissions")
 .select("user_id")
 .eq("id", id)
 .maybeSingle();

 if (!existing) {
 return NextResponse.json({ error: "Not found" }, { status: 404 });
 }

 const signoffResult = await processReviewSignoff(managerSession.supabase, body, {
 managerId: managerSession.user.id,
 seUserId: existing.user_id,
 tenantId: managerSession.tenantId,
 reviewType: "pitch",
 reviewTargetId: id,
 decision: parsed.data.status === "reviewed" ? "approve" : "reject",
 });
 if (signoffResult instanceof NextResponse) return signoffResult;

 const managerFeedback = signoffResult.feedback;

 const { error } = await managerSession.supabase
 .from("pitch_submissions")
 .update({
 status: parsed.data.status,
 manager_feedback: managerFeedback,
 manager_grade: parsed.data.managerGrade ?? null,
 reviewed_at: new Date().toISOString(),
 reviewed_by: managerSession.user.id,
 })
 .eq("id", id);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 if (parsed.data.status === "reviewed") {
 await managerSession.supabase.from("gamification_events").insert({
 user_id: existing.user_id,
 event_type: "pitch_approved",
 points: (parsed.data.managerGrade ?? 4) * 5,
 metadata: { pitchId: id, grade: parsed.data.managerGrade },
 });
 }

 return NextResponse.json({ success: true });
}
