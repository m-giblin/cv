import { NextResponse } from "next/server";
import { z } from "zod";
import { canViewUserCertifications } from "@/lib/certifications/authorize";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/supabase/server";

const CERT_TYPES = [
 "solo_discovery",
 "executive_demo",
 "competitive_bakeoff",
 "customer_workshop",
 "advisory_readiness",
 "agentic_fabric",
 "ais_readiness",
 "mcp_governance",
] as const;

export async function GET(request: Request) {
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

 const url = new URL(request.url);
 const userId = url.searchParams.get("userId") ?? user.id;

 if (!(await canViewUserCertifications(userId))) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 const { data, error } = await supabase
 .from("readiness_certifications")
 .select("*")
 .eq("user_id", userId)
 .order("certification_type");

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const existing = new Set((data ?? []).map((row) => row.certification_type));
 const missing = CERT_TYPES.filter((type) => !existing.has(type));

 if (missing.length > 0) {
 await supabase.from("readiness_certifications").insert(
 missing.map((certification_type) => ({ user_id: userId, certification_type })),
 );
 }

 const { data: refreshed } = await supabase
 .from("readiness_certifications")
 .select("*")
 .eq("user_id", userId)
 .order("certification_type");

 return NextResponse.json({ certifications: refreshed ?? [] });
}

const submitSchema = z.object({
 certificationType: z.enum(CERT_TYPES),
 evidenceText: z.string().min(20),
 evidenceUrl: z.string().optional().or(z.literal("")),
 evidencePath: z.string().optional(),
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

 const parsed = submitSchema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { error } = await supabase
 .from("readiness_certifications")
 .update({
 status: "submitted",
 evidence_text: parsed.data.evidenceText,
 evidence_url: parsed.data.evidencePath
 ? `storage:evidence/${parsed.data.evidencePath}`
 : parsed.data.evidenceUrl || null,
 })
 .eq("user_id", user.id)
 .eq("certification_type", parsed.data.certificationType)
 .in("status", ["not_started", "revoked"]);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const { data: profile } = await supabase.from("profiles").select("manager_id").eq("id", user.id).maybeSingle();

 if (profile?.manager_id) {
 await createNotification(supabase, {
 userId: profile.manager_id,
 title: "Certification submitted for approval",
 body: `Review ${parsed.data.certificationType.replaceAll("_", " ")} readiness evidence.`,
 actionUrl: `/certifications?profile=${user.id}`,
 });
 }

 return NextResponse.json({ success: true });
}
