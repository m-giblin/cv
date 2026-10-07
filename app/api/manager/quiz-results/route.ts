import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { loadAssignablePeople } from "@/lib/playbooks/assignment-access";

type Attempt = { question_id: string; quiz_id: string; chosen_index: number; correct: boolean; created_at: string };
type Question = { id: string; source_kind: string; playbook_id: string | null; topic: string; stem: string; choices: string[]; correct_index: number; explanation: string };

/** ?id= (a quiz assignment): every sitting since it was assigned, with each question, the answer picked and the right one. */
export async function GET(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  const params = new URL(request.url).searchParams;
  const id = params.get("id") ?? "";
  const chapterId = params.get("playbookAssignment");
  const admin = getTenantAdminClient() as unknown as SupabaseClient | null;
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  let row: { source_key: string; assigned_to: string; pass_score: number; created_at: string } | null = null;
  if (chapterId) {
    // A chapter assignment: its knowledge check is the chapter's own question bank.
    const { data } = await admin.from("playbook_assignments").select("*").eq("tenant_id", session.tenantId).eq("id", chapterId).maybeSingle();
    const chapter = data as { playbook_id: string; assigned_to: string; quiz_pass_score?: number; created_at: string } | null;
    if (chapter) row = { source_key: `playbook:${chapter.playbook_id}`, assigned_to: chapter.assigned_to, pass_score: chapter.quiz_pass_score ?? 80, created_at: chapter.created_at };
  } else {
    const { data } = await admin
      .from("quiz_assignments")
      .select("id, source_key, assigned_to, pass_score, created_at")
      .eq("tenant_id", session.tenantId)
      .eq("id", id)
      .maybeSingle();
    row = data as typeof row;
  }
  const people = row ? await loadAssignablePeople(session.tenantId, session.user.id, session.role) : [];
  if (!row || !people.some((person) => person.id === row.assigned_to)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: attemptRows } = await admin
    .from("question_attempts")
    .select("question_id, quiz_id, chosen_index, correct, created_at")
    .eq("tenant_id", session.tenantId)
    .eq("user_id", row.assigned_to)
    .gte("created_at", row.created_at)
    .order("created_at");
  const attempts = (attemptRows ?? []) as Attempt[];
  const ids = [...new Set(attempts.map((attempt) => attempt.question_id))];
  const { data: questionRows } = ids.length
    ? await admin.from("question_bank").select("id, source_kind, playbook_id, topic, stem, choices, correct_index, explanation").in("id", ids)
    : { data: [] };
  const questions = new Map(((questionRows ?? []) as Question[]).map((question) => [question.id, question]));
  const keyOf = (question: Question) =>
    question.source_kind === "playbook" ? `playbook:${question.playbook_id}` : `${question.source_kind}:${question.topic.trim().toLowerCase()}`;

  const sittings = new Map<string, { at: string; answers: { stem: string; chosen: string; correctAnswer: string; correct: boolean; explanation: string }[] }>();
  for (const attempt of attempts) {
    const question = questions.get(attempt.question_id);
    if (!question || keyOf(question) !== row.source_key) continue;
    const sitting = sittings.get(attempt.quiz_id) ?? { at: attempt.created_at, answers: [] };
    sitting.answers.push({
      stem: question.stem,
      chosen: question.choices[attempt.chosen_index] ?? "",
      correctAnswer: question.choices[question.correct_index] ?? "",
      correct: attempt.correct,
      explanation: question.explanation,
    });
    sittings.set(attempt.quiz_id, sitting);
  }
  const result = [...sittings.values()]
    .map((sitting) => {
      const score = Math.round((sitting.answers.filter((answer) => answer.correct).length / sitting.answers.length) * 100);
      return { ...sitting, score, passed: score >= row.pass_score };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
  return NextResponse.json({ passScore: row.pass_score, sittings: result });
}
