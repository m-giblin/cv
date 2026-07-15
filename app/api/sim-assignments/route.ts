import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getDashboardData } from "@/lib/data/get-dashboard-data";
import {
  buildPromptSnapshot,
  buildPromptVars,
  defaultSledPromptSnapshot,
  isParameterizedTemplate,
  resolveSimulationStartMessage,
} from "@/lib/simulations/prompt-template";

const assignSchema = z.object({
  seId: z.string().uuid(),
  simName: z.string().min(3).optional(),
  templateId: z.string().uuid().optional(),
  vertical: z.string().min(2).default("Enterprise"),
  solutionFocus: z.string().min(2).optional(),
  difficulty: z.enum(["foundational", "intermediate", "advanced"]).optional(),
  dueDate: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const parsed = assignSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: dashboard } = await getDashboardData();
  const orgIds = new Set(dashboard.myOrg.map((profile) => profile.id));
  if (!orgIds.has(parsed.data.seId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const solutionFocus = parsed.data.solutionFocus ?? parsed.data.simName ?? "Assigned practice simulation";
  let persona = "Dynamic (AI-generated buyer)";
  let vertical = parsed.data.vertical;
  let difficulty = parsed.data.difficulty ?? "intermediate";
  let promptBody = defaultSledPromptSnapshot({ solutionFocus, vertical, difficulty });
  let templateName = parsed.data.simName ?? "Assigned simulation";
  let practiceRoundsRequired = 1;
  let templateId = parsed.data.templateId ?? null;

  if (parsed.data.templateId) {
    const { data: template } = await session.supabase
      .from("simulation_templates")
      .select("*")
      .eq("id", parsed.data.templateId)
      .maybeSingle();

    if (template) {
      templateName = template.name;
      persona = template.persona;
      vertical = parsed.data.vertical;
      difficulty = parsed.data.difficulty ?? template.difficulty;
      practiceRoundsRequired =
        (template as { practice_rounds_before_submit?: number }).practice_rounds_before_submit ?? 1;

      if (isParameterizedTemplate(template.prompt_body)) {
        promptBody = buildPromptSnapshot(
          template.prompt_body,
          buildPromptVars({ solutionFocus, vertical, difficulty }),
        );
      } else {
        promptBody = template.prompt_body.includes("{{solution}}")
          ? template.prompt_body.replaceAll("{{solution}}", solutionFocus)
          : template.prompt_body;
      }
    }
  }

  const sessionData = {
    promptSnapshot: promptBody,
    aiRoleplay: true,
    simulationKind: "ai_roleplay",
    startMessage: resolveSimulationStartMessage(templateName, promptBody),
    practiceRoundsRequired,
    practiceRoundsCompleted: 0,
    dueDate: parsed.data.dueDate ?? null,
  };

  const { data, error } = await session.supabase
    .from("simulation_assignments")
    .insert({
      template_id: templateId,
      assigned_to: parsed.data.seId,
      assigned_by: session.user.id,
      persona,
      vertical,
      solution_focus: solutionFocus,
      difficulty,
      status: "not_started",
      transcript: [],
      session_data: sessionData,
      tenant_id: session.tenantId,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await session.supabase.from("notifications").insert({
    user_id: parsed.data.seId,
    title: "New simulation assigned",
    body: `${solutionFocus} • ${vertical}. Open Simulations to start.`,
    action_url: "/simulations?focus=simulation",
  });

  return NextResponse.json({ id: data.id, simName: templateName });
}
