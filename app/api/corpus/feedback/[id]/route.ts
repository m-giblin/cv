import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { syncCorpusAssetToLabIndex } from "@/lib/corpus/lab-bridge";

const resolveSchema = z.object({
 status: z.literal("resolved"),
 adminNote: z.string().max(2000).optional(),
 publishSmeAnswer: z.boolean().optional(),
 smeAnswer: z.string().max(4000).optional(),
});

export async function PATCH(
 request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const session = await requireAuthenticatedSession();
 if (session instanceof NextResponse) return session;

 const { data: profile } = await session.supabase
 .from("profiles")
 .select("role, tenant_id")
 .eq("id", session.user.id)
 .maybeSingle();

 if (!profile || !["admin", "director", "manager"].includes(profile.role)) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 const { id } = await context.params;
 const parsed = resolveSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { data: feedback } = await session.supabase
 .from("corpus_asset_feedback")
 .select("id, content_asset_id, comment")
 .eq("id", id)
 .maybeSingle();

 const { error } = await session.supabase
 .from("corpus_asset_feedback")
 .update({
 status: "resolved",
 admin_note: parsed.data.adminNote ?? null,
 resolved_at: new Date().toISOString(),
 resolved_by: session.user.id,
 })
 .eq("id", id);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 if (parsed.data.publishSmeAnswer && parsed.data.smeAnswer?.trim() && feedback?.content_asset_id) {
 const { data: asset } = await session.supabase
 .from("content_assets")
 .select("project_tags, module_tags")
 .eq("id", feedback.content_asset_id)
 .maybeSingle();

 await session.supabase.from("corpus_sme_answers").insert({
 question: feedback.comment ?? "Corpus feedback",
 answer: parsed.data.smeAnswer.trim(),
 content_asset_id: feedback.content_asset_id,
 project_tags: [...(asset?.project_tags ?? []), ...(asset?.module_tags ?? [])],
 source_feedback_id: feedback.id,
 created_by: session.user.id,
 });

 await syncCorpusAssetToLabIndex(session.supabase, feedback.content_asset_id);
 }

 auditMutation(
 session.user.id,
 "corpus.feedback.moderated",
 "corpus_asset_feedback",
 id,
 { publishSmeAnswer: Boolean(parsed.data.publishSmeAnswer) },
 profile.tenant_id,
 );

 return NextResponse.json({ success: true });
}
