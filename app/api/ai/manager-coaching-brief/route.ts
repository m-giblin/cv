import { NextResponse } from "next/server";
import { logAiUsage } from "@/lib/ai/log-usage";
import { generateText } from "ai";
import { z } from "zod";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { resolveAiProviderForUser } from "@/lib/ai/resolve-provider-for-user";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { getAccessTier } from "@/lib/auth/rbac";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { loadMentorRecords } from "@/lib/mentoring/mentor-records";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/types";

const requestSchema = z.object({
  reviewType: z.string(),
  personName: z.string().max(200),
  title: z.string().max(500),
  strengths: z.array(z.string()).max(12).optional(),
  gaps: z.array(z.string()).max(12).optional(),
  managerSummary: z.string().max(4000).optional(),
  recommendedImprovements: z.array(z.string()).max(8).optional(),
  context: z.string().max(8000).optional(),
  isManagerGate: z.boolean().optional(),
  /** A ramp step: the route reads its evidence (submission, mentor recommendation, criteria) itself. */
  assignmentStepId: z.string().uuid().optional(),
});

const REVIEW_LABELS: Record<string, string> = {
  plan_step: "ramp step",
  coaching: "simulation coaching card",
  submission: "challenge submission",
  certification: "certification gate",
  deal_prep: "deal prep brief",
  pitch: "pitch",
};

/**
 * What the manager is signing off on a ramp step. The manager's own session must be able to read the
 * step (RLS limits that to their people); the mentor's recommendation is then read with the service client.
 */
async function rampStepEvidence(supabase: SupabaseClient<Database>, assignmentStepId: string): Promise<string> {
  const { data: step } = await supabase
    .from("plan_assignment_steps")
    .select("notes, plan_assignments(user_id), plan_steps(description, metadata)")
    .eq("id", assignmentStepId)
    .maybeSingle();
  if (!step) return "";
  const row = step as unknown as {
    notes: string | null;
    plan_assignments: { user_id: string } | null;
    plan_steps: { description: string | null; metadata: Record<string, unknown> | null } | null;
  };
  const criteria = Array.isArray(row.plan_steps?.metadata?.criteria)
    ? (row.plan_steps!.metadata!.criteria as unknown[]).filter((item): item is string => typeof item === "string")
    : [];
  const admin = createAdminClient() as SupabaseClient<Database> | null;
  const userId = row.plan_assignments?.user_id;
  const recommendation =
    admin && userId
      ? (await loadMentorRecords(admin, [userId])).get(userId)?.gateRecommendations.find((item) => item.assignmentStepId === assignmentStepId)
      : undefined;
  return [
    row.plan_steps?.description ? `The task: ${row.plan_steps.description}` : "",
    criteria.length ? `Approval criteria: ${criteria.join("; ")}` : "",
    row.notes?.trim() ? `What the new hire wrote when submitting: ${row.notes.trim()}` : "",
    recommendation
      ? `Mentor ${recommendation.authorName} recommends ${recommendation.recommendation === "ready" ? "sign-off" : "waiting"}: ${recommendation.rationale}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function templateBrief(parsed: z.infer<typeof requestSchema>) {
  const strength =
    parsed.strengths?.[0] ??
    "Shows engagement with the scenario and willingness to practice.";
  const gap =
    parsed.gaps?.[0] ?? "Tighten discovery before jumping to product narrative.";
  const next =
    parsed.recommendedImprovements?.[0] ??
    "On the next rep, open with two customer-context questions before positioning.";
  return {
    brief: parsed.managerSummary?.trim()
      ? `${parsed.personName} submitted "${parsed.title}". ${parsed.managerSummary.trim()}`
      : `${parsed.personName} submitted "${parsed.title}" for your coaching sign-off.`,
    suggestedStrength: strength,
    suggestedGap: gap,
    suggestedNextAction: next,
    coachingQuestion: `What one behavior would you want ${parsed.personName.split(" ")[0]} to demonstrate on their next customer call?`,
    source: "template" as const,
  };
}

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const { data: profile } = await session.supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profile || getAccessTier((profile as { role: ProfileRole }).role) === "se") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
  if (rateLimited) return rateLimited;

  const fallback = templateBrief(parsed.data);
  // The manager waits on this draft, so it uses the provider's fast model.
  const ai = await resolveAiProviderForUser(session.supabase, session.user.id);
  const { provider } = ai;
  const model = ai.liveTurn?.model ?? ai.model;
  const modelName = ai.liveTurn?.modelName ?? ai.modelName;
  if (!model) {
    return NextResponse.json(fallback);
  }

  const evidence = parsed.data.assignmentStepId ? await rampStepEvidence(session.supabase, parsed.data.assignmentStepId) : "";
  const context = [parsed.data.context, evidence].filter(Boolean).join("\n");
  const prompt = `You are preparing a sales engineering manager to coach ${parsed.data.personName}.
Review type: ${REVIEW_LABELS[parsed.data.reviewType] ?? "review"}${parsed.data.isManagerGate ? " (stage gate, high stakes)" : ""}
Item: ${parsed.data.title}
Brief: ${parsed.data.managerSummary ?? "n/a"}
Strengths: ${(parsed.data.strengths ?? []).join("; ") || "n/a"}
Gaps: ${(parsed.data.gaps ?? []).join("; ") || "n/a"}
Coaching moments: ${(parsed.data.recommendedImprovements ?? []).join("; ") || "n/a"}
${context ? `Context:\n${context.slice(0, 4000)}` : ""}

Write for the manager in plain words; never mention review types, phases or other system labels.
Use only what is written above. Never invent details about the work (slides, numbers, customers, wording) that the material doesn't state. If the material shows no gap, set suggestedGap to "None shown in the evidence; ask about it in the 1:1." If it shows no strength, set suggestedStrength to "". The manager edits this draft, so leave out anything you can't point to above.

Return JSON only with keys:
brief (2-3 sentences on what happened and what to validate),
suggestedStrength (one specific strength, max 120 chars),
suggestedGap (one specific gap, max 120 chars),
suggestedNextAction (one concrete next behavior, max 140 chars),
coachingQuestion (one question for a live 1:1, max 120 chars)`;

  try {
    const result = await generateText({ model, prompt });
    await logAiUsage(session.supabase, {
      feature: "manager_coaching_brief",
      provider,
      model: modelName,
      userId: session.user.id,
      usage: result.usage,
    });
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(fallback);
    }
    const body = JSON.parse(match[0]) as {
      brief?: string;
      suggestedStrength?: string;
      suggestedGap?: string;
      suggestedNextAction?: string;
      coachingQuestion?: string;
    };
    return NextResponse.json({
      brief: body.brief ?? fallback.brief,
      suggestedStrength: body.suggestedStrength ?? fallback.suggestedStrength,
      suggestedGap: body.suggestedGap ?? fallback.suggestedGap,
      suggestedNextAction: body.suggestedNextAction ?? fallback.suggestedNextAction,
      coachingQuestion: body.coachingQuestion ?? fallback.coachingQuestion,
      source: "ai",
    });
  } catch {
    return NextResponse.json(fallback);
  }
}
