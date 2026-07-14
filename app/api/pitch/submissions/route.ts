import { NextResponse } from "next/server";
import { z } from "zod";
import { createNotification } from "@/lib/notifications/create-notification";
import { resolveProfileTenantId } from "@/lib/tenant/resolve-profile-tenant";
import { createClient } from "@/lib/supabase/server";

const postSchema = z.object({
 title: z.string().min(3),
 evidencePath: z.string().min(3),
 reflectionText: z.string().optional(),
 targetType: z.enum(["challenge", "certification", "practice"]).default("certification"),
 targetId: z.string().optional(),
 scenarioId: z.string().uuid().optional(),
 queueSlotId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
 const supabase = await createClient();

 if (!supabase) {
 return NextResponse.json({ submissions: [] });
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const url = new URL(request.url);
 const userId = url.searchParams.get("userId");
 const status = url.searchParams.get("status");

 let query = supabase.from("pitch_submissions").select("*").order("created_at", { ascending: false });

 if (userId) {
 query = query.eq("user_id", userId);
 } else {
 query = query.eq("user_id", user.id);
 }

 if (status) {
 query = query.eq("status", status);
 }

 const { data, error } = await query;

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({ submissions: data ?? [] });
}

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

 const parsed = postSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 if (parsed.data.targetType === "practice") {
 return NextResponse.json(
 { error: "Practice pitches save via /api/pitch/practice and do not notify your manager." },
 { status: 400 },
 );
 }

 if (!parsed.data.evidencePath.startsWith(`${user.id}/`)) {
 return NextResponse.json({ error: "Invalid evidence path." }, { status: 403 });
 }

 const { data: fileList } = await supabase.storage.from("evidence").list(user.id, { search: parsed.data.evidencePath.split("/").pop() });
 void fileList;

 const tenantId = await resolveProfileTenantId(supabase, user.id);

 if (parsed.data.queueSlotId) {
 const { data: slot } = await supabase
 .from("pitch_se_queue")
 .select("id, user_id, status, scenario_id")
 .eq("id", parsed.data.queueSlotId)
 .maybeSingle();

 if (!slot || slot.user_id !== user.id || slot.status !== "active") {
 return NextResponse.json({ error: "Invalid or inactive queue slot." }, { status: 400 });
 }

 if (parsed.data.scenarioId && slot.scenario_id !== parsed.data.scenarioId) {
 return NextResponse.json({ error: "Scenario does not match queue slot." }, { status: 400 });
 }
 }

 const { data, error } = await supabase
 .from("pitch_submissions")
 .insert({
 user_id: user.id,
 title: parsed.data.title,
 evidence_path: parsed.data.evidencePath,
 reflection_text: parsed.data.reflectionText ?? null,
 target_type: parsed.data.targetType,
 target_id: parsed.data.targetId ?? null,
 scenario_id: parsed.data.scenarioId ?? null,
 queue_slot_id: parsed.data.queueSlotId ?? null,
 status: "submitted",
 tenant_id: tenantId,
 })
 .select("*")
 .single();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const { data: profile } = await supabase.from("profiles").select("manager_id").eq("id", user.id).maybeSingle();

 if (profile?.manager_id) {
 await createNotification(supabase, {
 userId: profile.manager_id,
 title: "Video pitch submitted",
 body: `Review ${parsed.data.title} from your SE.`,
 actionUrl: "/manager?section=inbox",
 });
 }

 if (parsed.data.queueSlotId) {
 await supabase
 .from("pitch_se_queue")
 .update({ submission_id: data.id })
 .eq("id", parsed.data.queueSlotId)
 .eq("user_id", user.id);
 }

 await supabase.from("activity_logs").insert({
 user_id: user.id,
 event_type: "pitch_submitted",
 title: `Pitch submitted: ${parsed.data.title}`,
 tenant_id: tenantId,
 metadata: { pitchSubmissionId: data.id },
 });

 return NextResponse.json({ submission: data });
}
