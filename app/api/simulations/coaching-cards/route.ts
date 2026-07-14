import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCoachingAttestation } from "@/lib/ai/coaching-attestation";
import { coachingCardSchema } from "@/lib/ai/schemas";
import { createNotification } from "@/lib/notifications/create-notification";
import { submitSimulationPlanSteps } from "@/lib/plans/complete-step";
import { resolveProfileTenantId } from "@/lib/tenant/resolve-profile-tenant";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
 simulationAssignmentId: z.string().uuid().optional(),
 structuredOutput: coachingCardSchema,
 seReflection: z.string().optional(),
 transcript: z.string().optional(),
 isPractice: z.boolean().default(false),
 simulationContext: z
 .object({
 persona: z.string(),
 vertical: z.string(),
 solutionFocus: z.string(),
 difficulty: z.string(),
 })
 .optional(),
 attestationToken: z.string().min(20).optional(),
});

export async function POST(request: Request) {
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

 const parsed = schema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const card = {
 ...parsed.data.structuredOutput,
 transcript: parsed.data.transcript ?? null,
 simulationContext: parsed.data.simulationContext ?? null,
 };

 // Practice rounds require a linked assignment — never trust isPractice alone (prevents auto-approve bypass).
 const isPractice = Boolean(parsed.data.isPractice && parsed.data.simulationAssignmentId);

 if (parsed.data.isPractice && !parsed.data.simulationAssignmentId) {
 return NextResponse.json(
 { error: "Practice rounds must be linked to a simulation assignment." },
 { status: 400 },
 );
 }

 if (!isPractice) {
 if (!parsed.data.attestationToken) {
 return NextResponse.json(
 { error: "Generate a coaching card via AI before submitting for manager review." },
 { status: 400 },
 );
 }

 if (
 !verifyCoachingAttestation(
 user.id,
 parsed.data.attestationToken,
 parsed.data.structuredOutput,
 )
 ) {
 return NextResponse.json(
 { error: "Invalid or expired coaching card attestation. Regenerate your coaching card." },
 { status: 403 },
 );
 }
 }

 const tenantId = await resolveProfileTenantId(supabase, user.id);

 const { data, error } = await supabase
 .from("coaching_cards")
 .insert({
 simulation_assignment_id: parsed.data.simulationAssignmentId ?? null,
 user_id: user.id,
 structured_output: card,
 se_reflection: parsed.data.seReflection ?? null,
 is_practice: isPractice,
 manager_review_status: isPractice ? "reviewed" : "pending",
 sent_to_manager_at: isPractice ? null : new Date().toISOString(),
 tenant_id: tenantId,
 })
 .select("id")
 .single();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 let practiceRoundsCompleted = 0;

 if (isPractice && parsed.data.simulationAssignmentId) {
 const { data: assignment } = await supabase
 .from("simulation_assignments")
 .select("session_data")
 .eq("id", parsed.data.simulationAssignmentId)
 .eq("assigned_to", user.id)
 .maybeSingle();

 const session =
 assignment?.session_data && typeof assignment.session_data === "object"
 ? (assignment.session_data as Record<string, unknown>)
 : {};

 practiceRoundsCompleted = (typeof session.practiceRoundsCompleted === "number"
 ? session.practiceRoundsCompleted
 : 0) + 1;

 await supabase
 .from("simulation_assignments")
 .update({
 status: "in_progress",
 transcript: [],
 session_data: {
 ...session,
 practiceRoundsCompleted,
 },
 })
 .eq("id", parsed.data.simulationAssignmentId);

 await supabase.from("activity_logs").insert({
 user_id: user.id,
 event_type: "simulation_completed",
 title: "Completed simulation practice round",
 tenant_id: tenantId,
 metadata: {
 coachingCardId: data.id,
 simulationAssignmentId: parsed.data.simulationAssignmentId,
 isPractice: true,
 practiceRound: practiceRoundsCompleted,
 },
 });

 return NextResponse.json({ id: data.id, isPractice: true, practiceRoundsCompleted });
 }

 if (parsed.data.simulationAssignmentId) {
 await supabase
 .from("simulation_assignments")
 .update({ status: "submitted" })
 .eq("id", parsed.data.simulationAssignmentId);
 }

 await submitSimulationPlanSteps(supabase, {
 userId: user.id,
 simulationAssignmentId: parsed.data.simulationAssignmentId,
 });

 await supabase.from("activity_logs").insert({
 user_id: user.id,
 event_type: "simulation_completed",
 title: "Submitted simulation for manager review",
 tenant_id: tenantId,
 metadata: { coachingCardId: data.id, simulationAssignmentId: parsed.data.simulationAssignmentId ?? null },
 });

 const { data: profile } = await supabase
 .from("profiles")
 .select("manager_id")
 .eq("id", user.id)
 .maybeSingle();

 if (profile?.manager_id) {
 await createNotification(supabase, {
 userId: profile.manager_id,
 title: "Simulation coaching card ready",
 body: "An SE submitted simulation results for your review — open Manager to see the transcript and scores.",
 actionUrl: "/manager",
 });
 }

 return NextResponse.json({ id: data.id, isPractice: false, practiceRoundsCompleted });
}
