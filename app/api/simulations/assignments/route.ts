import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { requireManagerSession } from "@/lib/auth/require-manager";
import {
  buildPromptSnapshot,
  buildPromptVars,
  defaultSledPromptSnapshot,
  isParameterizedTemplate,
  resolveSimulationStartMessage,
} from "@/lib/simulations/prompt-template";

const assignSchema = z
  .object({
    templateId: z.string().uuid().optional(),
    /** Single assignee (legacy). */
    assignedTo: z.string().uuid().optional(),
    /** One or more assignees (preferred for bulk). */
    assignedToIds: z.array(z.string().uuid()).min(1).max(200).optional(),
    persona: z.string().min(3).optional(),
    vertical: z.string().min(2),
    solutionFocus: z.string().min(2),
    difficulty: z.enum(["foundational", "intermediate", "advanced"]).optional(),
  })
  .refine((value) => Boolean(value.assignedTo) || Boolean(value.assignedToIds?.length), {
    message: "assignedTo or assignedToIds is required",
    path: ["assignedToIds"],
  });

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const parsed = assignSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const assigneeIds = [
    ...new Set(
      parsed.data.assignedToIds?.length
        ? parsed.data.assignedToIds
        : parsed.data.assignedTo
          ? [parsed.data.assignedTo]
          : [],
    ),
  ];

  if (assigneeIds.length === 0) {
    return NextResponse.json({ error: "No assignees provided." }, { status: 400 });
  }

  let persona = parsed.data.persona ?? "Dynamic (AI-generated buyer)";
  let vertical = parsed.data.vertical;
  let solutionFocus = parsed.data.solutionFocus;
  let difficulty = parsed.data.difficulty ?? "intermediate";
  let promptBody = defaultSledPromptSnapshot({ solutionFocus, vertical, difficulty });
  let aiRoleplay = true;
  let templateName = "SLED Sales Roleplay";
  let practiceRoundsRequired = 1;

  if (parsed.data.templateId) {
    const { data: template } = await session.supabase
      .from("simulation_templates")
      .select("*")
      .eq("id", parsed.data.templateId)
      .maybeSingle();

    if (template) {
      templateName = template.name;
      persona = template.persona;
      solutionFocus = parsed.data.solutionFocus;
      vertical = parsed.data.vertical;
      difficulty = parsed.data.difficulty ?? template.difficulty;
      practiceRoundsRequired =
        (template as { practice_rounds_before_submit?: number }).practice_rounds_before_submit ?? 1;

      if (isParameterizedTemplate(template.prompt_body)) {
        promptBody = buildPromptSnapshot(
          template.prompt_body,
          buildPromptVars({ solutionFocus, vertical, difficulty }),
        );
        aiRoleplay = true;
      } else {
        promptBody = template.prompt_body.includes("{{solution}}")
          ? template.prompt_body.replaceAll("{{solution}}", solutionFocus)
          : template.prompt_body;
        aiRoleplay = true;
      }
    }
  }

  const sessionData = {
    promptSnapshot: promptBody,
    aiRoleplay,
    simulationKind: aiRoleplay ? "ai_roleplay" : "generic",
    startMessage: resolveSimulationStartMessage(templateName, promptBody),
    practiceRoundsRequired,
    practiceRoundsCompleted: 0,
  };

  const rows = assigneeIds.map((assignedTo) => ({
    template_id: parsed.data.templateId ?? null,
    assigned_to: assignedTo,
    assigned_by: session.user.id,
    persona,
    vertical,
    solution_focus: solutionFocus,
    difficulty,
    status: "not_started" as const,
    transcript: [],
    session_data: sessionData,
    tenant_id: session.tenantId,
  }));

  const { data, error } = await session.supabase
    .from("simulation_assignments")
    .insert(rows)
    .select("id, assigned_to");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const created = data ?? [];
  if (created.length > 0) {
    await session.supabase.from("notifications").insert(
      created.map((row) => ({
        user_id: row.assigned_to,
        title: "New simulation assigned",
        body: `${solutionFocus} • ${vertical} • ${difficulty.replace("_", " ")}. Open Simulations to start.`,
        action_url: "/simulations?focus=simulation",
      })),
    );
  }

  auditMutation(
    session.user.id,
    "simulation.assigned",
    "simulation_assignment",
    created[0]?.id,
    {
      templateName,
      assignedCount: created.length,
      assignedToIds: created.map((row) => row.assigned_to),
    },
    session.tenantId,
  );

  return NextResponse.json({
    id: created[0]?.id,
    ids: created.map((row) => row.id),
    assignedCount: created.length,
  });
}

export async function GET() {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { data: templates } = await session.supabase
    .from("simulation_templates")
    .select("id, name, persona, vertical, solution_focus, difficulty, prompt_body")
    .order("name");

  const mapped = (templates ?? []).map((template) => ({
    id: template.id,
    name: template.name,
    persona: template.persona,
    vertical: template.vertical,
    solution_focus: template.solution_focus,
    difficulty: template.difficulty,
    parameterized: isParameterizedTemplate(template.prompt_body),
    hasSolutionPlaceholder: template.prompt_body.includes("{{solution}}"),
  }));

  return NextResponse.json({ templates: mapped });
}
