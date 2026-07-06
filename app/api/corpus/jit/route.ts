import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { answerCorpusQuestionWithConfidence } from "@/lib/corpus/lab-bridge";
import { loadCorpusAssetsForTags } from "@/lib/corpus/lab-bridge";
import { dispatchQaRouting, loadRoutingRulesForTags } from "@/lib/corpus/routing-dispatch";
import { getUserReleaseProjectTags } from "@/lib/corpus/user-release-tags";

const schema = z.object({
  query: z.string().min(3).max(500),
  projectTag: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const releaseTags = await getUserReleaseProjectTags(session.supabase, session.user.id);
  const tags = [
    ...new Set([
      ...(parsed.data.projectTag ? [parsed.data.projectTag] : []),
      ...releaseTags,
    ]),
  ];

  const [answer, assets] = await Promise.all([
    answerCorpusQuestionWithConfidence(session.supabase, parsed.data.query, tags),
    loadCorpusAssetsForTags(session.supabase, tags, 6),
  ]);

  const routeToSme = answer.confidence < 0.7;
  let routed = false;

  if (routeToSme) {
    const rules = await loadRoutingRulesForTags(session.supabase, tags);
    const routing = await dispatchQaRouting({
      question: parsed.data.query,
      rules,
      assetTitle: "JIT corpus query",
      draftAnswer: answer.answer,
      sources: answer.sources,
      confidence: answer.confidence,
    });
    routed = routing.sent;
  }

  return NextResponse.json({
    query: parsed.data.query,
    answer: answer.answer,
    confidence: answer.confidence,
    sources: answer.sources,
    assets,
    routedToSme: routed,
    releaseTags,
  });
}
