import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { loadQuestion, updateQuestion } from "@/lib/question-bank/data";

const schema = z.object({
  stem: z.string().trim().min(10).max(400),
  choices: z.array(z.string().trim().min(1).max(200)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().max(600),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

/** Hand edits to a question's wording, options, answer key or difficulty. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the question." }, { status: 400 });
  if (!(await loadQuestion(session.tenantId, id))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const input = parsed.data;
  await updateQuestion(session.tenantId, id, {
    stem: input.stem,
    choices: input.choices,
    correct_index: input.correctIndex,
    explanation: input.explanation,
    difficulty: input.difficulty,
  });
  return NextResponse.json({ ok: true });
}
