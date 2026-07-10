import { NextResponse } from "next/server";
import { z } from "zod";
import { processReviewSignoff } from "@/lib/coaching/process-review-signoff";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  debriefNotes: z.string().optional(),
  sharedWithManager: z.boolean().optional(),
  managerComment: z.string().optional(),
  coachingSignoff: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
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

 const parsed = patchSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const body = parsed.data as Record<string, unknown>;
 const { id } = await context.params;
 const updates: Record<string, unknown> = {};

 if (parsed.data.coachingSignoff) {
 const managerSession = await requireManagerSession();
 if (managerSession instanceof NextResponse) return managerSession;

 const { data: prepSession } = await supabase
 .from("deal_prep_sessions")
 .select("user_id")
 .eq("id", id)
 .maybeSingle();
 if (!prepSession) {
 return NextResponse.json({ error: "Session not found" }, { status: 404 });
 }

 const signoffResult = await processReviewSignoff(managerSession.supabase, body, {
 managerId: managerSession.user.id,
 seUserId: prepSession.user_id,
 tenantId: managerSession.tenantId,
 reviewType: "deal_prep",
 reviewTargetId: id,
 decision: "approve",
 });
 if (signoffResult instanceof NextResponse) return signoffResult;
 updates.manager_comment = signoffResult.feedback;
 } else {
 if (parsed.data.debriefNotes !== undefined) {
 updates.debrief_notes = parsed.data.debriefNotes;
 }
 if (parsed.data.sharedWithManager !== undefined) {
 updates.shared_with_manager = parsed.data.sharedWithManager;
 }
 if (parsed.data.managerComment !== undefined) {
 updates.manager_comment = parsed.data.managerComment;
 }
 }

 if (Object.keys(updates).length === 0) {
 return NextResponse.json({ error: "No updates provided" }, { status: 400 });
 }

 const { data: session } = await supabase
 .from("deal_prep_sessions")
 .select("user_id, shared_with_manager")
 .eq("id", id)
 .maybeSingle();

 if (!session) {
 return NextResponse.json({ error: "Session not found" }, { status: 404 });
 }

 const isOwner = session.user_id === user.id;
 const isManagerCommentOnly =
 (parsed.data.managerComment !== undefined || parsed.data.coachingSignoff !== undefined) &&
 parsed.data.debriefNotes === undefined &&
 parsed.data.sharedWithManager === undefined;

 if (!isOwner && !isManagerCommentOnly) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 if (isManagerCommentOnly && !isOwner) {
 if (!session.shared_with_manager) {
 return NextResponse.json({ error: "Session not shared with manager" }, { status: 403 });
 }

 const { data: profile } = await supabase
 .from("profiles")
 .select("manager_id")
 .eq("id", session.user_id)
 .maybeSingle();

 if (profile?.manager_id !== user.id) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }
 }

 const { data, error } = await supabase
 .from("deal_prep_sessions")
 .update(updates as Database["public"]["Tables"]["deal_prep_sessions"]["Update"])
 .eq("id", id)
 .select("*")
 .maybeSingle();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 if (
 parsed.data.sharedWithManager === true &&
 !session.shared_with_manager &&
 isOwner
 ) {
 const { data: profile } = await supabase
 .from("deal_prep_sessions")
 .select("account_name, user_id")
 .eq("id", id)
 .maybeSingle();

 const { data: seProfile } = await supabase
 .from("profiles")
 .select("manager_id, full_name")
 .eq("id", session.user_id)
 .maybeSingle();

 if (seProfile?.manager_id && profile) {
 await createNotification(supabase, {
 userId: seProfile.manager_id,
 title: "Deal prep shared for review",
 body: `${seProfile.full_name} shared a brief for ${profile.account_name}.`,
 actionUrl: "/manager",
 });
 }
 }

 return NextResponse.json({ session: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
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

 const { data, error } = await supabase
 .from("deal_prep_sessions")
 .delete()
 .eq("id", id)
 .eq("user_id", user.id)
 .select("id")
 .maybeSingle();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 if (!data) {
 return NextResponse.json({ error: "Session not found" }, { status: 404 });
 }

 return NextResponse.json({ success: true });
}

export async function GET(_request: Request, context: RouteContext) {
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

 const { data, error } = await supabase
 .from("deal_prep_sessions")
 .select("*")
 .eq("id", id)
 .maybeSingle();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 if (!data) {
 return NextResponse.json({ error: "Session not found" }, { status: 404 });
 }

 if (data.user_id !== user.id) {
 if (!data.shared_with_manager) {
 return NextResponse.json({ error: "Session not found" }, { status: 404 });
 }

 const { data: profile } = await supabase
 .from("profiles")
 .select("manager_id")
 .eq("id", data.user_id)
 .maybeSingle();

 if (profile?.manager_id !== user.id) {
 return NextResponse.json({ error: "Session not found" }, { status: 404 });
 }
 }

 let accountVersions: { id: string; version_number: number; created_at: string }[] = [];
 if (data.account_key) {
 const { data: versions } = await supabase
 .from("deal_prep_sessions")
 .select("id, version_number, created_at")
 .eq("user_id", data.user_id)
 .eq("account_key", data.account_key)
 .order("version_number", { ascending: false });

 accountVersions = versions ?? [];
 }

 return NextResponse.json({ session: data, accountVersions });
}
