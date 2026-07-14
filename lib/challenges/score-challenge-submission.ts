import { generateObject } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { resolveAiProvider } from "@/lib/ai/provider";

export type ChallengeAiReview = {
  score: number;
  suggestedGrade: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  evidenceNotes: string;
  source: "ai" | "template";
};

const reviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  suggestedGrade: z.number().int().min(1).max(5),
  summary: z.string().max(600),
  strengths: z.array(z.string().max(200)).min(1).max(4),
  gaps: z.array(z.string().max(200)).min(1).max(4),
  evidenceNotes: z.string().max(400),
});

function scoreToGrade(score: number): number {
  if (score >= 88) return 5;
  if (score >= 75) return 4;
  if (score >= 62) return 3;
  if (score >= 50) return 2;
  return 1;
}

function templateReview(input: {
  challengeTitle: string;
  reflectionText: string;
  evidenceCount: number;
}): ChallengeAiReview {
  const reflectionLen = input.reflectionText.trim().length;
  const base = Math.min(85, 55 + Math.floor(reflectionLen / 12) + input.evidenceCount * 8);
  return {
    score: base,
    suggestedGrade: scoreToGrade(base),
    summary: `${input.challengeTitle}: SE submitted reflection and ${input.evidenceCount} evidence item(s). Validate query accuracy, business-risk linkage, and that attached proof matches the challenge steps.`,
    strengths: [
      reflectionLen > 80
        ? "Reflection shows structured thinking about the challenge outcome."
        : "Submission is in queue for manager validation.",
    ],
    gaps: [
      input.evidenceCount === 0
        ? "No evidence attached — confirm proof of work before approving."
        : "Confirm attached evidence matches success criteria before final sign-off.",
    ],
    evidenceNotes: "Open each attachment below to verify screenshots, exports, or workflow artifacts.",
    source: "template",
  };
}

export async function scoreChallengeSubmission(
  supabase: SupabaseClient,
  params: {
    reviewerUserId: string;
    submissionId: string;
    challenge: {
      title: string;
      description: string;
      steps: string[];
      successCriteria: string[];
      linkedSolutions: string[];
    };
    reflectionText: string;
    evidenceFiles: string[];
  },
): Promise<ChallengeAiReview> {
  const fallback = templateReview({
    challengeTitle: params.challenge.title,
    reflectionText: params.reflectionText,
    evidenceCount: params.evidenceFiles.length,
  });

  const rateLimited = await enforceAiRateLimit(supabase, params.reviewerUserId);
  if (rateLimited) return fallback;

  const { model, provider, modelName } = await resolveAiProvider();
  if (!model) return fallback;

  const evidenceSummary = params.evidenceFiles
    .map((file, index) => {
      if (file.startsWith("storage:evidence/")) {
        const name = file.split("/").pop() ?? file;
        return `${index + 1}. Uploaded file: ${name}`;
      }
      return `${index + 1}. Link: ${file}`;
    })
    .join("\n");

  try {
    const result = await generateObject({
      model,
      schema: reviewSchema,
      prompt: `You are grading a SailPoint SE challenge submission for a manager review inbox.
Use the challenge rubric and SLED enablement standards. The manager will verify visual evidence separately — score based on reflection quality, rubric alignment, and whether evidence was provided.

Challenge: ${params.challenge.title}
Description: ${params.challenge.description}
Steps:
${params.challenge.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}
Success criteria:
${params.challenge.successCriteria.map((c) => `- ${c}`).join("\n")}
Linked solutions: ${params.challenge.linkedSolutions.join(", ") || "Identity Security Cloud"}

SE reflection:
${params.reflectionText || "(none)"}

Evidence submitted:
${evidenceSummary || "(none — penalize heavily)"}

Return:
- score 0-100 against success criteria
- suggestedGrade 1-5 for manager override (5=exemplary, 4=ready for field, 3=needs coaching, 2=redo)
- summary for manager (what to validate in 2 sentences)
- strengths and gaps (specific to ISC/SailPoint terminology)
- evidenceNotes: what the manager should look for in attachments`,
      experimental_telemetry: { isEnabled: true, functionId: "score-challenge-submission" },
    });

    await logAiUsage(supabase, {
      feature: "challenge_review",
      provider,
      model: modelName,
      userId: params.reviewerUserId,
      usage: result.usage,
    });

    const review: ChallengeAiReview = {
      ...result.object,
      source: "ai",
    };

    await supabase
      .from("challenge_submissions")
      .update({
        ai_suggested_score: review.score,
        ai_review: review as never,
      })
      .eq("id", params.submissionId);

    return review;
  } catch {
    return fallback;
  }
}

export function parseStoredAiReview(raw: unknown): ChallengeAiReview | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.score !== "number") return null;
  return {
    score: row.score,
    suggestedGrade: typeof row.suggestedGrade === "number" ? row.suggestedGrade : scoreToGrade(row.score),
    summary: String(row.summary ?? ""),
    strengths: Array.isArray(row.strengths) ? row.strengths.map(String) : [],
    gaps: Array.isArray(row.gaps) ? row.gaps.map(String) : [],
    evidenceNotes: String(row.evidenceNotes ?? ""),
    source: row.source === "ai" ? "ai" : "template",
  };
}
