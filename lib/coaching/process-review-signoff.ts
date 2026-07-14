import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  assertCadenceGateForSegmentSignoff,
  feedbackFromSignoff,
  persistCoachingSignoff,
  signoffFromRequestBody,
} from "@/lib/coaching/persist-signoff";
import type { ReviewSignoffContext } from "@/lib/coaching/signoff-policy";
import { signoffTierForReview } from "@/lib/coaching/signoff-policy";
import { validateCoachingSignoff } from "@/lib/coaching/signoff-validation";

export async function processReviewSignoff(
  supabase: SupabaseClient<Database>,
  body: Record<string, unknown>,
  params: {
    managerId: string;
    seUserId: string;
    tenantId: string | null;
    reviewType: ReviewSignoffContext["reviewType"];
    reviewTargetId: string;
    decision: "approve" | "reject";
    isManagerGate?: boolean;
    skipCadenceGate?: boolean;
  },
): Promise<{ feedback: string } | NextResponse> {
  const tier = signoffTierForReview({
    reviewType: params.reviewType,
    isManagerGate: params.isManagerGate,
  });
  const signoff = signoffFromRequestBody(body);
  const validation = validateCoachingSignoff(tier, signoff, params.decision);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });
  }

  if (
    params.decision === "approve" &&
    params.isManagerGate &&
    !params.skipCadenceGate
  ) {
    const cadence = await assertCadenceGateForSegmentSignoff(supabase, {
      managerId: params.managerId,
      seUserId: params.seUserId,
      signoff,
    });
    if (!cadence.ok) {
      return NextResponse.json({ error: cadence.message }, { status: 403 });
    }
  }

  await persistCoachingSignoff(supabase, {
    managerId: params.managerId,
    seUserId: params.seUserId,
    tenantId: params.tenantId,
    reviewType: params.reviewType,
    reviewTargetId: params.reviewTargetId,
    decision: params.decision,
    tier,
    signoff,
    aiDraftEdited: validation.aiDraftEdited,
  });

  return { feedback: feedbackFromSignoff(signoff) || validation.combinedFeedback };
}
