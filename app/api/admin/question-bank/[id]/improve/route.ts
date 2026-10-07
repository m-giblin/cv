import { NextResponse } from "next/server";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { resolveAiProviderForTenant } from "@/lib/ai/resolve-provider-for-user";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { insertDrafts, loadQuestion } from "@/lib/question-bank/data";
import { draftImprovement } from "@/lib/question-bank/generate";

/** Drafts a rewrite of a question; approving the draft retires the original. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const question = await loadQuestion(session.tenantId, id);
  if (!question) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { model, provider, modelName } = await resolveAiProviderForTenant(session.tenantId);
  if (!model) return NextResponse.json({ error: "AI isn't configured for this workspace." }, { status: 503 });
  const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
  if (rateLimited) return rateLimited;

  try {
    const problem = question.health.flag ? question.health.label : "an admin asked for a clearer, fairer version";
    const result = await draftImprovement({ model, question, stats: question.stats, problem });
    await logAiUsage(session.supabase, {
      feature: "question_bank",
      provider,
      model: modelName,
      userId: session.user.id,
      usage: result.usage,
      tenantId: session.tenantId,
    });
    const saved = await insertDrafts({
      tenantId: session.tenantId,
      userId: session.user.id,
      source: { kind: question.sourceKind, playbookId: question.playbookId, topic: question.topic, title: question.topic },
      drafts: [{ ...result.question, sourceUrl: result.question.sourceUrl || question.sourceUrl || undefined }],
      sourceTitle: question.sourceTitle,
      replacesId: question.id,
      solution: question.solution,
    });
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: "The AI couldn't rewrite it just now. Try again in a moment." }, { status: 502 });
  }
}
