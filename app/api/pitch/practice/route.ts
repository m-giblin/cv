import { NextResponse } from "next/server";
import { z } from "zod";
import { submitAssignmentStep, StepSegmentLockedError } from "@/lib/plans/complete-step";
import {
  PITCH_SAVED_EVENT,
  overallPitchScore,
  pitchSnippet,
  pitchStepNotes,
  pitchWordCount,
  readPitchSavedMetadata,
  type AttachedPitch,
} from "@/lib/pitch/pitch-step";
import { resolveEffectiveTenantId } from "@/lib/tenant/resolve-profile-tenant";
import { createClient } from "@/lib/supabase/server";

const postSchema = z.object({
  title: z.string().min(3),
  evidencePath: z.string().min(3).optional(),
  reflectionText: z.string().optional(),
  scenarioId: z.string().uuid().optional(),
  aiScores: z.array(z.object({ label: z.string(), score: z.number() })).optional(),
  responseMode: z.enum(["video", "voice", "text"]).default("video"),
  transcript: z.string().max(8000).optional(),
  durationSec: z.number().int().min(0).max(600).optional(),
  /** The AI review's top note, kept so the reviewer sees the same coaching the SE did. */
  coachingNote: z.string().max(600).optional(),
  /** Ramp step this pitch is for (plan_assignment_steps.id). */
  assignmentStepId: z.string().uuid().optional(),
  /** With assignmentStepId: also submit the step for review. */
  submitStep: z.boolean().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.evidencePath && !parsed.data.evidencePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Invalid evidence path." }, { status: 403 });
  }

  const stepId = parsed.data.assignmentStepId;
  if (stepId) {
    // Only the SE's own, not-yet-validated step can take the pitch.
    const { data: step } = await supabase.from("plan_assignment_steps").select("id, status, assignment_id").eq("id", stepId).maybeSingle();
    const { data: assignment } = step
      ? await supabase.from("plan_assignments").select("user_id").eq("id", step.assignment_id).maybeSingle()
      : { data: null };
    if (!step || assignment?.user_id !== user.id) {
      return NextResponse.json({ error: "That ramp step isn't yours." }, { status: 403 });
    }
    if (step.status === "reviewed") {
      return NextResponse.json({ error: "This step is already validated." }, { status: 400 });
    }
  }

  const tenantId = await resolveEffectiveTenantId(supabase, user.id);

  const { data, error } = await supabase
    .from("pitch_practice_sessions")
    .insert({
      user_id: user.id,
      tenant_id: tenantId,
      title: parsed.data.title,
      reflection_text: parsed.data.reflectionText ?? null,
      evidence_path: parsed.data.evidencePath ?? null,
      scenario_id: parsed.data.scenarioId ?? null,
      ai_scores: parsed.data.aiScores ?? null,
      response_mode: parsed.data.responseMode,
      transcript: parsed.data.transcript ?? null,
      duration_sec: parsed.data.durationSec ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const score = overallPitchScore(parsed.data.aiScores);
  const submitting = Boolean(stepId && parsed.data.submitStep);

  // The activity row is what links the saved pitch to its ramp step (pitch_practice_sessions has no step column).
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    event_type: PITCH_SAVED_EVENT,
    title: `Practice saved: ${parsed.data.title}`,
    tenant_id: tenantId,
    metadata: {
      practiceSessionId: data.id,
      ...(stepId ? { assignmentStepId: stepId, submitted: submitting } : {}),
      ...(score !== null ? { score } : {}),
      ...(parsed.data.coachingNote ? { coachingNote: parsed.data.coachingNote } : {}),
    },
  });

  if (stepId && submitting) {
    try {
      await submitAssignmentStep(supabase, {
        assignmentStepId: stepId,
        userId: user.id,
        notes: pitchStepNotes({ reflection: parsed.data.reflectionText, score, responseMode: parsed.data.responseMode }),
      });
    } catch (submitError) {
      const status = submitError instanceof StepSegmentLockedError ? 403 : 400;
      return NextResponse.json(
        {
          session: data,
          error: `Your pitch is saved, but the step couldn't be submitted: ${submitError instanceof Error ? submitError.message : "try again"}`,
        },
        { status },
      );
    }
  }

  return NextResponse.json({ session: data, score, submitted: submitting });
}

/** The latest pitch attached to one of the SE's ramp steps, for the step workbench. */
export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stepId = new URL(request.url).searchParams.get("assignmentStepId");
  if (!stepId || !z.string().uuid().safeParse(stepId).success) {
    return NextResponse.json({ error: "assignmentStepId is required." }, { status: 400 });
  }

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("metadata, created_at")
    .eq("user_id", user.id)
    .eq("event_type", PITCH_SAVED_EVENT)
    .eq("metadata->>assignmentStepId", stepId)
    .order("created_at", { ascending: false })
    .limit(1);
  const link = logs?.[0] ? readPitchSavedMetadata(logs[0].metadata) : null;
  if (!link?.practiceSessionId) {
    return NextResponse.json({ pitch: null });
  }

  const { data: session } = await supabase
    .from("pitch_practice_sessions")
    .select("id, created_at, response_mode, transcript, reflection_text, ai_scores")
    .eq("id", link.practiceSessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ pitch: null });
  }

  const text = session.transcript ?? session.reflection_text ?? "";
  const pitch: AttachedPitch = {
    id: session.id,
    createdAt: session.created_at,
    responseMode: session.response_mode,
    score: link.score ?? overallPitchScore(session.ai_scores),
    words: pitchWordCount(text),
    snippet: pitchSnippet(text, 40),
    coachingNote: link.coachingNote,
    submitted: link.submitted,
  };
  return NextResponse.json({ pitch });
}
