import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { logIscLabInteraction } from "@/lib/isc-lab/session-log";

const schema = z.object({
 accountName: z.string().min(2),
 reply: z.string().min(10),
 sessionId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
 const session = await requireAuthenticatedSession();
 if (session instanceof NextResponse) return session;

 const parsed = schema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { accountName, reply, sessionId } = parsed.data;
 const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
 const block = `\n\n--- ISC Lab insight (${stamp}) ---\n${reply}`;

 if (sessionId) {
 const { data: existing } = await session.supabase
 .from("deal_prep_sessions")
 .select("id, user_id, debrief_notes")
 .eq("id", sessionId)
 .maybeSingle();

 if (!existing || existing.user_id !== session.user.id) {
 return NextResponse.json({ error: "Session not found" }, { status: 404 });
 }

 const { error } = await session.supabase
 .from("deal_prep_sessions")
 .update({ debrief_notes: `${existing.debrief_notes ?? ""}${block}`.trim() })
 .eq("id", sessionId);

 if (error) return NextResponse.json({ error: error.message }, { status: 500 });

 await logIscLabInteraction(session.supabase, {
 userId: session.user.id,
 mode: "chat",
 query: `Save to prep: ${accountName}`,
 accountName,
 reply,
 sources: [],
 savedToPrepSessionId: sessionId,
 });

 return NextResponse.json({ sessionId, href: `/prep?session=${sessionId}` });
 }

 const { data: created, error } = await session.supabase
 .from("deal_prep_sessions")
 .insert({
 user_id: session.user.id,
 account_name: accountName,
 industry: "General",
 solutions: ["Identity Security Cloud"],
 account_context: `ISC Lab saved insight for ${accountName}`,
 debrief_notes: block.trim(),
 prep_output: {
 executiveSummary: reply.slice(0, 500),
 source: "isc_lab",
 },
 })
 .select("id")
 .single();

 if (error || !created) {
 return NextResponse.json({ error: error?.message ?? "Create failed" }, { status: 500 });
 }

 await logIscLabInteraction(session.supabase, {
 userId: session.user.id,
 mode: "chat",
 query: `Save to prep: ${accountName}`,
 accountName,
 reply,
 sources: [],
 savedToPrepSessionId: created.id,
 });

 return NextResponse.json({ sessionId: created.id, href: `/prep?session=${created.id}` });
}
