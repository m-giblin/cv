import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { isParameterizedTemplate } from "@/lib/simulations/prompt-template";

const schema = z.object({
  name: z.string().min(3),
  persona: z.string().min(3),
  vertical: z.string().min(2),
  solutionFocus: z.string().min(2),
  promptBody: z.string().min(20),
  difficulty: z.enum(["foundational", "intermediate", "advanced"]).optional(),
  practiceRoundsBeforeSubmit: z.number().int().min(0).max(10).optional(),
});

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { data, error } = await session.supabase
    .from("simulation_templates")
    .select("id, name, persona, vertical, solution_focus, difficulty, prompt_body, practice_rounds_before_submit, created_at, updated_at")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const templates = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    persona: row.persona,
    vertical: row.vertical,
    solutionFocus: row.solution_focus,
    difficulty: row.difficulty,
    promptBody: row.prompt_body,
    practiceRoundsBeforeSubmit:
      (row as { practice_rounds_before_submit?: number }).practice_rounds_before_submit ?? 1,
    parameterized: isParameterizedTemplate(row.prompt_body),
    hasSolutionPlaceholder: row.prompt_body.includes("{{solution}}"),
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await session.supabase.from("simulation_templates").insert({
    name: parsed.data.name,
    persona: parsed.data.persona,
    vertical: parsed.data.vertical,
    solution_focus: parsed.data.solutionFocus,
    difficulty: parsed.data.difficulty ?? "intermediate",
    prompt_body: parsed.data.promptBody,
    practice_rounds_before_submit: parsed.data.practiceRoundsBeforeSubmit ?? 1,
    created_by: session.user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
