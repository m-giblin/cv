import { NextResponse } from "next/server";
import { z } from "zod";
import {
 dispatchQaRouting,
 escalateStaleCorpusInquiries,
 loadRoutingRulesForTags,
} from "@/lib/corpus/routing-dispatch";
import { answerCorpusQuestionWithConfidence, syncCorpusAssetToLabIndex } from "@/lib/corpus/lab-bridge";
import { createNotification } from "@/lib/notifications/create-notification";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";

const feedbackSchema = z.object({
 contentAssetId: z.string().uuid(),
 isConfusing: z.boolean().default(false),
 comment: z.string().max(2000).optional(),
 question: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
 const session = await requireAuthenticatedSession();
 if (session instanceof NextResponse) return session;

 await escalateStaleCorpusInquiries(session.supabase);

 const parsed = feedbackSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { contentAssetId, isConfusing, comment, question } = parsed.data;

 const { data: asset } = await session.supabase
 .from("content_assets")
 .select("id, title, project_tags, module_tags")
 .eq("id", contentAssetId)
 .maybeSingle();

 if (!asset) {
 return NextResponse.json({ error: "Asset not found" }, { status: 404 });
 }

 const { data: feedbackRow, error } = await session.supabase
 .from("corpus_asset_feedback")
 .insert({
 content_asset_id: contentAssetId,
 user_id: session.user.id,
 is_confusing: isConfusing,
 comment: comment ?? question ?? null,
 status: "open",
 })
 .select("id")
 .single();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const tags = [...(asset.project_tags ?? []), ...(asset.module_tags ?? [])];
 let routingResult: { sent: boolean; destinations: string[] } | null = null;
 let confidence: number | null = null;
 let draftAnswer: string | null = null;

 if (question?.trim()) {
 const grounded = await answerCorpusQuestionWithConfidence(
 session.supabase,
 question.trim(),
 tags,
 );
 confidence = grounded.confidence;
 draftAnswer = grounded.answer;

 const rules = await loadRoutingRulesForTags(session.supabase, tags);
 const shouldRoute = grounded.confidence < 0.72 || rules.length > 0;

 if (shouldRoute && rules.length > 0) {
 routingResult = await dispatchQaRouting({
 question: question.trim(),
 rules,
 assetTitle: asset.title,
 draftAnswer: grounded.answer,
 sources: grounded.sources,
 confidence: grounded.confidence,
 });
 }

 await session.supabase.from("corpus_qa_inquiries").insert({
 user_id: session.user.id,
 content_asset_id: contentAssetId,
 question: question.trim(),
 asset_tags: tags,
 routed_destination_type: rules[0]?.destinationType ?? null,
 routed_destination_address: rules[0]?.destinationAddress ?? null,
 confidence_score: grounded.confidence,
 draft_answer: grounded.answer,
 source_urls: grounded.sources.map((s) => s.url),
 status: routingResult?.sent ? "routed" : "routed",
 });
 }

 if (isConfusing) {
 const { data: admins } = await session.supabase
 .from("profiles")
 .select("id")
 .in("role", ["admin", "director", "manager"]);

 for (const admin of admins ?? []) {
 await createNotification(session.supabase, {
 userId: admin.id,
 title: "Corpus feedback — confusing content",
 body: `${asset.title}: ${comment ?? "Flagged as confusing"}`,
 actionUrl: "/admin?tab=corpus",
 });
 }
 }

 return NextResponse.json({
 id: feedbackRow.id,
 routed: routingResult?.sent ?? false,
 destinations: routingResult?.destinations ?? [],
 confidence,
 draftAnswer,
 });
}

export async function GET() {
 const session = await requireAuthenticatedSession();
 if (session instanceof NextResponse) return session;

 const { data: profile } = await session.supabase
 .from("profiles")
 .select("role")
 .eq("id", session.user.id)
 .maybeSingle();

 if (!profile || !["admin", "director", "manager"].includes(profile.role)) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 await escalateStaleCorpusInquiries(session.supabase);

 const { data, error } = await session.supabase
 .from("corpus_asset_feedback")
 .select(
 "id, content_asset_id, user_id, is_confusing, comment, status, admin_note, created_at, content_assets(title), profiles(full_name, email)",
 )
 .eq("status", "open")
 .order("created_at", { ascending: false })
 .limit(50);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({ feedback: data ?? [] });
}
