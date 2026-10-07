import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { gradeQuiz, loadAvailableChecks, serveQuiz } from "@/lib/question-bank/data";
import { resolveEffectiveTenantId } from "@/lib/tenant/resolve-profile-tenant";

/** ?source=key: a quiz in rotation for that source. No source: the checks on offer. */
export async function GET(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const tenantId = await resolveEffectiveTenantId(session.supabase, session.user.id);
  if (!tenantId) return NextResponse.json({ checks: [] });
  const key = new URL(request.url).searchParams.get("source");
  if (!key) return NextResponse.json({ checks: await loadAvailableChecks(tenantId, session.user.id) });
  const quiz = await serveQuiz(tenantId, session.user.id, key);
  if (!quiz || !quiz.questions.length) return NextResponse.json({ error: "No questions are ready for this yet." }, { status: 404 });
  return NextResponse.json(quiz);
}

const answerSchema = z.object({
  answers: z
    .array(z.object({ questionId: z.string().uuid(), chosenIndex: z.number().int().min(0).max(5) }))
    .min(1)
    .max(20),
});

/** Grades answers, records them for rotation and question stats, and returns explanations. */
export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const parsed = answerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Answer every question first." }, { status: 400 });
  const tenantId = await resolveEffectiveTenantId(session.supabase, session.user.id);
  if (!tenantId) return NextResponse.json({ error: "No workspace." }, { status: 400 });
  return NextResponse.json(await gradeQuiz({ tenantId, userId: session.user.id, answers: parsed.data.answers }));
}
