import { NextResponse } from "next/server";
import { z } from "zod";
import { createNotification } from "@/lib/notifications/create-notification";
import { submitAssignmentStep } from "@/lib/plans/complete-step";
import { createClient } from "@/lib/supabase/server";

const submissionSchema = z
  .object({
    challengeId: z.string().uuid(),
    reflectionText: z.string().min(10),
    evidenceUrl: z.string().url().optional().or(z.literal("")),
    evidencePath: z.string().min(3).optional().or(z.literal("")),
  })
  .refine((data) => data.evidenceUrl || data.evidencePath, {
    message: "Provide an evidence file or link.",
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

  const parsed = submissionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const evidenceFiles = [
    ...(parsed.data.evidencePath ? [`storage:evidence/${parsed.data.evidencePath}`] : []),
    ...(parsed.data.evidenceUrl ? [parsed.data.evidenceUrl] : []),
  ];

  if (parsed.data.evidencePath) {
    const normalizedPath = parsed.data.evidencePath.replace(/^\/+/, "");
    if (!normalizedPath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Invalid evidence path." }, { status: 400 });
    }

    const { data: objectList, error: storageError } = await supabase.storage
      .from("evidence")
      .list(user.id, { search: normalizedPath.split("/").pop() });

    if (storageError) {
      return NextResponse.json({ error: "Could not verify evidence file." }, { status: 400 });
    }

    const fileName = normalizedPath.split("/").pop();
    const exists = objectList?.some((item) => item.name === fileName);
    if (!exists) {
      return NextResponse.json({ error: "Evidence file not found. Upload again before submitting." }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("challenge_submissions")
    .insert({
      user_id: user.id,
      challenge_id: parsed.data.challengeId,
      reflection_text: parsed.data.reflectionText,
      evidence_files: evidenceFiles,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    actor_id: user.id,
    event_type: "challenge_submitted",
    title: "Challenge submitted for manager review",
    metadata: { submissionId: data.id },
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("manager_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const managerId = (profile as { manager_id: string | null } | null)?.manager_id;

  if (managerId) {
    await createNotification(supabase, {
      userId: managerId,
      title: "Challenge ready for review",
      body: `${(profile as { full_name: string } | null)?.full_name ?? "An SE"} submitted a challenge.`,
      actionUrl: "/manager",
    });
  }

  const { data: assignments } = await supabase
    .from("plan_assignments")
    .select("id")
    .eq("user_id", user.id)
    .neq("status", "completed");

  for (const assignment of assignments ?? []) {
    const { data: steps } = await supabase
      .from("plan_assignment_steps")
      .select("id, plan_step_id, status")
      .eq("assignment_id", assignment.id)
      .in("status", ["not_started", "in_progress"]);

    for (const step of steps ?? []) {
      const { data: planStep } = await supabase
        .from("plan_steps")
        .select("step_type, challenge_id")
        .eq("id", step.plan_step_id)
        .maybeSingle();

      if (
        planStep?.step_type === "challenge" &&
        (!planStep.challenge_id || planStep.challenge_id === parsed.data.challengeId)
      ) {
        await submitAssignmentStep(supabase, {
          assignmentStepId: step.id,
          userId: user.id,
        });
        break;
      }
    }
  }

  return NextResponse.json({ id: data.id });
}
