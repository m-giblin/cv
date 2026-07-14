import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeAccountKey } from "@/lib/deal-prep/account-key";
import { FULL_PREP_LIMIT, RECENT_PREP_LIMIT } from "@/lib/deal-prep/constants";
import { resolveProfileTenantId } from "@/lib/tenant/resolve-profile-tenant";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import { linkDealPrepPlanSteps } from "@/lib/plans/complete-step";

const schema = z.object({
 accountName: z.string().min(2),
 industry: z.string().min(2),
 solutions: z.array(z.string()).min(1),
 accountContext: z.string().optional(),
 meetingType: z.string().optional(),
 dealStage: z.string().optional(),
 attendees: z.string().optional(),
 meetingDate: z.string().optional(),
 competitors: z.string().optional(),
 prepOutput: z.record(z.string(), z.unknown()),
 parentSessionId: z.string().uuid().optional(),
 assignmentStepId: z.string().uuid().optional(),
});

type SessionRow = {
 id: string;
 account_name: string;
 industry: string;
 solutions: string[];
 account_key: string | null;
 version_number: number;
 meeting_type: string | null;
 created_at: string;
 shared_with_manager: boolean;
};

function groupSessionsByAccount(sessions: SessionRow[]) {
 const groups = new Map<
 string,
 {
 accountKey: string;
 accountName: string;
 industry: string;
 latestSessionId: string;
 latestAt: string;
 versionCount: number;
 sharedWithManager: boolean;
 versions: SessionRow[];
 }
 >();

 for (const session of sessions) {
 const key = session.account_key ?? normalizeAccountKey(session.account_name);
 const existing = groups.get(key);

 if (!existing) {
 groups.set(key, {
 accountKey: key,
 accountName: session.account_name,
 industry: session.industry,
 latestSessionId: session.id,
 latestAt: session.created_at,
 versionCount: 1,
 sharedWithManager: session.shared_with_manager,
 versions: [session],
 });
 continue;
 }

 existing.versions.push(session);
 existing.versionCount += 1;
 if (session.shared_with_manager) {
 existing.sharedWithManager = true;
 }
 }

 return [...groups.values()].sort(
 (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
 );
}

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
 const scope = url.searchParams.get("scope") === "all" ? "all" : "recent";
 const groupByAccount = url.searchParams.get("group") === "account";
 const query = url.searchParams.get("q")?.trim() ?? "";

 const { count: totalCount, error: countError } = await supabase
 .from("deal_prep_sessions")
 .select("id", { count: "exact", head: true })
 .eq("user_id", user.id);

 if (countError) {
 return NextResponse.json({ error: countError.message }, { status: 500 });
 }

 const total = totalCount ?? 0;
 const useFullHistory = scope === "all" || query.length > 0 || groupByAccount;
 const limit = useFullHistory ? FULL_PREP_LIMIT : RECENT_PREP_LIMIT;

 let sessionsQuery = supabase
 .from("deal_prep_sessions")
 .select(
 "id, account_name, industry, solutions, account_key, version_number, meeting_type, created_at, shared_with_manager",
 )
 .eq("user_id", user.id)
 .order("created_at", { ascending: false })
 .limit(limit);

 if (query.length > 0) {
 const escaped = query.replace(/[%_,]/g, "");
 sessionsQuery = sessionsQuery.or(
 `account_name.ilike.%${escaped}%,industry.ilike.%${escaped}%,competitors.ilike.%${escaped}%`,
 );
 }

 const { data, error } = await sessionsQuery;

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const sessions = data ?? [];
 const effectiveScope = useFullHistory ? "all" : "recent";

 if (groupByAccount) {
 const groups = groupSessionsByAccount(sessions as SessionRow[]);
 return NextResponse.json({
 groups,
 total,
 scope: effectiveScope,
 query,
 recentLimit: RECENT_PREP_LIMIT,
 searchEnabled: total >= RECENT_PREP_LIMIT,
 hasOlder: effectiveScope === "recent" && total > RECENT_PREP_LIMIT && query.length === 0,
 showing: groups.length,
 });
 }

 return NextResponse.json({
 sessions,
 total,
 scope: effectiveScope,
 query,
 recentLimit: RECENT_PREP_LIMIT,
 searchEnabled: total >= RECENT_PREP_LIMIT,
 hasOlder: effectiveScope === "recent" && total > RECENT_PREP_LIMIT && query.length === 0,
 showing: sessions.length,
 });
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

 const parsed = schema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const accountKey = normalizeAccountKey(parsed.data.accountName);
 let versionNumber = 1;
 let parentSessionId = parsed.data.parentSessionId ?? null;

 if (parentSessionId) {
 const { data: parent } = await supabase
 .from("deal_prep_sessions")
 .select("id, version_number, account_key")
 .eq("id", parentSessionId)
 .eq("user_id", user.id)
 .maybeSingle();

 if (parent) {
 versionNumber = (parent.version_number ?? 1) + 1;
 } else {
 parentSessionId = null;
 }
 }

 if (!parentSessionId) {
 const { data: latest } = await supabase
 .from("deal_prep_sessions")
 .select("version_number")
 .eq("user_id", user.id)
 .eq("account_key", accountKey)
 .order("version_number", { ascending: false })
 .limit(1)
 .maybeSingle();

 if (latest?.version_number) {
 versionNumber = latest.version_number + 1;
 }
 }

 const tenantId = await resolveProfileTenantId(supabase, user.id);

 const { data, error } = await supabase
 .from("deal_prep_sessions")
 .insert({
 user_id: user.id,
 account_name: parsed.data.accountName,
 industry: parsed.data.industry,
 solutions: parsed.data.solutions,
 account_context: parsed.data.accountContext ?? null,
 meeting_type: parsed.data.meetingType ?? null,
 deal_stage: parsed.data.dealStage ?? null,
 attendees: parsed.data.attendees ?? null,
 meeting_date: parsed.data.meetingDate ?? null,
 competitors: parsed.data.competitors ?? null,
 prep_output: parsed.data.prepOutput as Json,
 account_key: accountKey,
 version_number: versionNumber,
 parent_session_id: parentSessionId,
 tenant_id: tenantId,
 })
 .select("id, version_number")
 .single();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 await supabase.from("activity_logs").insert({
 user_id: user.id,
 event_type: "deal_prep_completed",
 title: `Deal prep saved for ${parsed.data.accountName}`,
 tenant_id: tenantId,
 metadata: {
 session_id: data.id,
 account_name: parsed.data.accountName,
 version_number: data.version_number,
 },
 });

 await linkDealPrepPlanSteps(supabase, {
 userId: user.id,
 sessionId: data.id,
 accountName: parsed.data.accountName,
 assignmentStepId: parsed.data.assignmentStepId,
 });

 return NextResponse.json({ id: data.id, versionNumber: data.version_number });
}
