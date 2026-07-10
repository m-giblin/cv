import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { SignoffTier } from "@/lib/coaching/signoff-policy";
import { CADENCE_GATE_DAYS } from "@/lib/coaching/signoff-policy";
import type { CoachingSignoffInput } from "@/lib/coaching/signoff-validation";
import { combinedFeedback, reviewDurationMs } from "@/lib/coaching/signoff-validation";

export async function persistCoachingSignoff(
  supabase: SupabaseClient<Database>,
  params: {
    managerId: string;
    seUserId: string;
    tenantId: string | null;
    reviewType: string;
    reviewTargetId: string;
    decision: "approve" | "reject";
    tier: SignoffTier;
    signoff: CoachingSignoffInput;
    aiDraftEdited: boolean;
  },
) {
  const { error } = await supabase.from("manager_coaching_signoffs").insert({
    manager_id: params.managerId,
    se_user_id: params.seUserId,
    tenant_id: params.tenantId,
    review_type: params.reviewType,
    review_target_id: params.reviewTargetId,
    decision: params.decision,
    signoff_tier: params.tier,
    strength: params.signoff.strength.trim(),
    gap: params.signoff.gap?.trim() || null,
    next_action: params.signoff.nextAction.trim(),
    confidence: params.signoff.confidence ?? null,
    live_attestation: params.signoff.liveAttestation ?? false,
    attestation_note: params.signoff.attestationNote?.trim() || null,
    ai_draft: params.signoff.aiDraft?.trim() || null,
    ai_draft_edited: params.aiDraftEdited,
    review_duration_ms: reviewDurationMs(params.signoff.openedAt),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function assertCadenceGateForSegmentSignoff(
  supabase: SupabaseClient<Database>,
  params: {
    managerId: string;
    seUserId: string;
    signoff: CoachingSignoffInput;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (params.signoff.liveAttestation) {
    return { ok: true };
  }

  const since = new Date();
  since.setDate(since.getDate() - CADENCE_GATE_DAYS);

  const [{ data: signoffs }, { data: notes }] = await Promise.all([
    supabase
      .from("manager_coaching_signoffs")
      .select("id")
      .eq("manager_id", params.managerId)
      .eq("se_user_id", params.seUserId)
      .eq("decision", "approve")
      .gte("created_at", since.toISOString())
      .limit(1),
    supabase
      .from("manager_coaching_notes")
      .select("updated_at")
      .eq("manager_id", params.managerId)
      .eq("se_user_id", params.seUserId)
      .maybeSingle(),
  ]);

  const recentNote =
    notes?.updated_at && new Date(notes.updated_at).getTime() >= since.getTime();

  if ((signoffs?.length ?? 0) > 0 || recentNote) {
    return { ok: true };
  }

  return {
    ok: false,
    message: `No coaching touchpoint with this SE in the last ${CADENCE_GATE_DAYS} days. Schedule a 1:1 or check Live coaching attestation on the sign-off form.`,
  };
}

export function signoffFromRequestBody(body: Record<string, unknown>): CoachingSignoffInput {
  const signoff = (body.coachingSignoff ?? body) as Record<string, unknown>;
  return {
    strength: String(signoff.strength ?? ""),
    gap: signoff.gap ? String(signoff.gap) : undefined,
    nextAction: String(signoff.nextAction ?? signoff.next_action ?? ""),
    confidence:
      signoff.confidence === null || signoff.confidence === undefined
        ? null
        : Number(signoff.confidence),
    liveAttestation: Boolean(signoff.liveAttestation ?? signoff.live_attestation),
    attestationNote: signoff.attestationNote
      ? String(signoff.attestationNote)
      : signoff.attestation_note
        ? String(signoff.attestation_note)
        : undefined,
    aiDraft: signoff.aiDraft ? String(signoff.aiDraft) : signoff.ai_draft ? String(signoff.ai_draft) : undefined,
    aiSuggestedStrength: signoff.aiSuggestedStrength
      ? String(signoff.aiSuggestedStrength)
      : undefined,
    aiSuggestedGap: signoff.aiSuggestedGap ? String(signoff.aiSuggestedGap) : undefined,
    aiSuggestedNextAction: signoff.aiSuggestedNextAction
      ? String(signoff.aiSuggestedNextAction)
      : undefined,
    openedAt: signoff.openedAt ? String(signoff.openedAt) : undefined,
  };
}

export function feedbackFromSignoff(signoff: CoachingSignoffInput): string {
  return combinedFeedback(signoff);
}
