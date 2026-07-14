import type { SignoffTier } from "@/lib/coaching/signoff-policy";
import { MIN_FIELD_LENGTH } from "@/lib/coaching/signoff-policy";

export type CoachingSignoffInput = {
  strength: string;
  gap?: string;
  nextAction: string;
  confidence?: number | null;
  liveAttestation?: boolean;
  attestationNote?: string;
  aiDraft?: string;
  aiSuggestedStrength?: string;
  aiSuggestedGap?: string;
  aiSuggestedNextAction?: string;
  openedAt?: string;
};

export type CoachingSignoffValidation = {
  ok: boolean;
  errors: string[];
  combinedFeedback: string;
  aiDraftEdited: boolean;
};

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function editedFromAi(value: string, aiValue?: string) {
  if (!aiValue?.trim()) return true;
  return normalize(value) !== normalize(aiValue);
}

export function validateCoachingSignoff(
  tier: SignoffTier,
  input: CoachingSignoffInput,
  decision: "approve" | "reject",
): CoachingSignoffValidation {
  const errors: string[] = [];
  const mins = MIN_FIELD_LENGTH[tier];

  if (decision === "reject") {
    const feedback = [input.strength, input.gap, input.nextAction].filter(Boolean).join("\n\n").trim();
    if (feedback.length < 3) {
      errors.push("Add guidance before sending back for revision.");
    }
    return { ok: errors.length === 0, errors, combinedFeedback: feedback, aiDraftEdited: false };
  }

  if (input.strength.trim().length < mins.strength) {
    errors.push(`Strength must be at least ${mins.strength} characters.`);
  }
  if (tier !== "light") {
    if ((input.gap ?? "").trim().length < mins.gap) {
      errors.push(`Gap must be at least ${mins.gap} characters.`);
    }
  }
  if (input.nextAction.trim().length < mins.nextAction) {
    errors.push(`Next action must be at least ${mins.nextAction} characters.`);
  }

  if (tier === "hard") {
    if (!input.confidence || input.confidence < 1 || input.confidence > 5) {
      errors.push("Rate your confidence in their readiness (1–5).");
    }
    if (!input.liveAttestation) {
      errors.push("Confirm live coaching attestation for this gate.");
    } else if ((input.attestationNote ?? "").trim().length < 12) {
      errors.push("Describe how you coached or observed them (attestation note).");
    }
  }

  const hasAiSuggestions =
    Boolean(input.aiSuggestedStrength?.trim()) ||
    Boolean(input.aiSuggestedGap?.trim()) ||
    Boolean(input.aiSuggestedNextAction?.trim()) ||
    Boolean(input.aiDraft?.trim());

  const aiDraftEdited =
    !hasAiSuggestions ||
    editedFromAi(input.strength, input.aiSuggestedStrength) ||
    editedFromAi(input.gap ?? "", input.aiSuggestedGap) ||
    editedFromAi(input.nextAction, input.aiSuggestedNextAction) ||
    (input.aiDraft ? normalize(combinedFeedback(input)) !== normalize(input.aiDraft) : true);

  if (hasAiSuggestions && !aiDraftEdited) {
    errors.push("Edit at least one AI suggestion before signing off — make it yours.");
  }

  return {
    ok: errors.length === 0,
    errors,
    combinedFeedback: combinedFeedback(input),
    aiDraftEdited,
  };
}

export function combinedFeedback(input: CoachingSignoffInput): string {
  const parts = [
    input.strength.trim() ? `Strength: ${input.strength.trim()}` : "",
    input.gap?.trim() ? `Gap: ${input.gap.trim()}` : "",
    input.nextAction.trim() ? `Next: ${input.nextAction.trim()}` : "",
    input.confidence ? `Readiness confidence: ${input.confidence}/5` : "",
    input.liveAttestation && input.attestationNote?.trim()
      ? `Live coaching: ${input.attestationNote.trim()}`
      : "",
  ].filter(Boolean);
  return parts.join("\n\n");
}

export function reviewDurationMs(openedAt?: string): number | null {
  if (!openedAt) return null;
  const start = Date.parse(openedAt);
  if (Number.isNaN(start)) return null;
  return Math.max(0, Date.now() - start);
}
