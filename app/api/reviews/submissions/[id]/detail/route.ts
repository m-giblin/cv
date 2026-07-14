import { NextResponse } from "next/server";
import { canReviewUserWork } from "@/lib/auth/can-review";
import { requireManagerSession } from "@/lib/auth/require-manager";
import {
  parseStoredAiReview,
  scoreChallengeSubmission,
  type ChallengeAiReview,
} from "@/lib/challenges/score-challenge-submission";
import { resolveEvidenceEntry } from "@/lib/evidence/resolve-evidence-file";

function parseChallengeField(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;

  const { data: submission, error } = await session.supabase
    .from("challenge_submissions")
    .select(
      "id, user_id, challenge_id, reflection_text, evidence_files, ai_suggested_score, ai_review, submitted_at, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (!(await canReviewUserWork(submission.user_id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: challenge } = await session.supabase
    .from("challenges")
    .select("title, description, steps, success_criteria, linked_solutions, estimated_minutes, difficulty, target_level, ai_metadata")
    .eq("id", submission.challenge_id)
    .maybeSingle();

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const steps = parseChallengeField(challenge.steps);
  const successCriteria = parseChallengeField(challenge.success_criteria);
  const linkedSolutions = parseChallengeField(challenge.linked_solutions);
  const aiMetadata =
    challenge.ai_metadata && typeof challenge.ai_metadata === "object" && !Array.isArray(challenge.ai_metadata)
      ? (challenge.ai_metadata as { linkedResources?: string[]; competencyNames?: string[] })
      : null;
  const linkedResources = Array.isArray(aiMetadata?.linkedResources)
    ? aiMetadata.linkedResources.map(String)
    : [];
  const competencyNames = Array.isArray(aiMetadata?.competencyNames)
    ? aiMetadata.competencyNames.map(String)
    : [];

  let aiReview: ChallengeAiReview | null = parseStoredAiReview(submission.ai_review);

  if (!aiReview && submission.status === "submitted") {
    aiReview = await scoreChallengeSubmission(session.supabase, {
      reviewerUserId: session.user.id,
      submissionId: submission.id,
      challenge: {
        title: challenge.title,
        description: challenge.description ?? "",
        steps,
        successCriteria,
        linkedSolutions,
      },
      reflectionText: submission.reflection_text ?? "",
      evidenceFiles: submission.evidence_files ?? [],
    });
  } else if (!aiReview && submission.ai_suggested_score != null) {
    aiReview = {
      score: submission.ai_suggested_score,
      suggestedGrade: submission.ai_suggested_score >= 88 ? 5 : submission.ai_suggested_score >= 75 ? 4 : 3,
      summary: "Prior AI score on file — verify evidence below.",
      strengths: [],
      gaps: [],
      evidenceNotes: "Review attached proof before approving.",
      source: "template",
    };
  }

  const evidence = await Promise.all(
    (submission.evidence_files ?? []).map((entry, index) =>
      resolveEvidenceEntry(session.supabase, entry, submission.user_id).then((resolved) => ({
        label: resolved.label,
        href: resolved.href,
        kind: resolved.kind,
        unavailable: resolved.unavailable,
        openUrl: resolved.href ?? `/api/reviews/submissions/${submission.id}/evidence?index=${index}`,
      })),
    ),
  );

  const { data: seProfile } = await session.supabase
    .from("profiles")
    .select("full_name")
    .eq("id", submission.user_id)
    .maybeSingle();

  return NextResponse.json({
    submission: {
      id: submission.id,
      reflectionText: submission.reflection_text,
      submittedAt: submission.submitted_at,
      status: submission.status,
    },
    personName: (seProfile as { full_name?: string } | null)?.full_name ?? "Team member",
    challenge: {
      id: submission.challenge_id,
      title: challenge.title,
      description: challenge.description,
      steps,
      successCriteria,
      linkedSolutions,
      linkedResources,
      competencyNames,
      estimatedMinutes: challenge.estimated_minutes,
      difficulty: challenge.difficulty,
      targetLevel: challenge.target_level,
    },
    evidence,
    aiReview,
  });
}
