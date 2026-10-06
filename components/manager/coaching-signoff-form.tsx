"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag } from "@/components/ui/tag";
import type { SignoffTier } from "@/lib/coaching/signoff-policy";
import type { CoachingSignoffInput } from "@/lib/coaching/signoff-validation";
import { validateCoachingSignoff } from "@/lib/coaching/signoff-validation";

const INPUT_CLASS =
  "w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] font-normal text-ink";
const LABEL_CLASS = "block space-y-1.5 text-sm font-semibold text-ink";

const TIER_TAG: Record<SignoffTier, { label: string; tone: "danger" | "blue" | "neutral" }> = {
  hard: { label: "Gate", tone: "danger" },
  standard: { label: "Required", tone: "blue" },
  light: { label: "Light", tone: "neutral" },
};

export type CoachingBrief = {
  brief: string;
  suggestedStrength: string;
  suggestedGap: string;
  suggestedNextAction: string;
  coachingQuestion: string;
  source?: string;
};

export type CoachingSignoffState = CoachingSignoffInput & {
  applyBrief: (brief: CoachingBrief) => void;
};

export function useCoachingSignoffState(initial?: Partial<CoachingSignoffInput>) {
  const [strength, setStrength] = useState(initial?.strength ?? "");
  const [gap, setGap] = useState(initial?.gap ?? "");
  const [nextAction, setNextAction] = useState(initial?.nextAction ?? "");
  const [confidence, setConfidence] = useState<number | null>(initial?.confidence ?? null);
  const [liveAttestation, setLiveAttestation] = useState(initial?.liveAttestation ?? false);
  const [attestationNote, setAttestationNote] = useState(initial?.attestationNote ?? "");
  const [aiDraft, setAiDraft] = useState(initial?.aiDraft ?? "");
  const [aiSuggestedStrength, setAiSuggestedStrength] = useState(initial?.aiSuggestedStrength ?? "");
  const [aiSuggestedGap, setAiSuggestedGap] = useState(initial?.aiSuggestedGap ?? "");
  const [aiSuggestedNextAction, setAiSuggestedNextAction] = useState(initial?.aiSuggestedNextAction ?? "");
  const [openedAt, setOpenedAt] = useState(initial?.openedAt ?? new Date().toISOString());

  const value: CoachingSignoffInput = {
    strength,
    gap,
    nextAction,
    confidence,
    liveAttestation,
    attestationNote,
    aiDraft,
    aiSuggestedStrength,
    aiSuggestedGap,
    aiSuggestedNextAction,
    openedAt,
  };

  function applyBrief(brief: CoachingBrief) {
    setStrength(brief.suggestedStrength);
    setGap(brief.suggestedGap);
    setNextAction(brief.suggestedNextAction);
    setAiSuggestedStrength(brief.suggestedStrength);
    setAiSuggestedGap(brief.suggestedGap);
    setAiSuggestedNextAction(brief.suggestedNextAction);
    setAiDraft([brief.suggestedStrength, brief.suggestedGap, brief.suggestedNextAction].join("\n"));
  }

  return {
    value,
    setStrength,
    setGap,
    setNextAction,
    setConfidence,
    setLiveAttestation,
    setAttestationNote,
    setOpenedAt,
    applyBrief,
  };
}

export function ManagerCoachingBriefPanel({
  payload,
  onBrief,
}: {
  payload: Record<string, unknown>;
  onBrief: (brief: CoachingBrief) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<CoachingBrief | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch("/api/ai/manager-coaching-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify(payload),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: CoachingBrief | null) => {
        if (cancelled || !body) return;
        setBrief(body);
        onBrief(body);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload)]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-[14px] bg-blue-soft px-4 py-3 text-sm text-ink-2" role="status">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin text-blue" />
        Preparing coaching brief
      </div>
    );
  }

  if (!brief) return null;

  return (
    <section className="space-y-2 rounded-[14px] bg-blue-soft px-4 py-3.5">
      <h3 className="flex items-center gap-2">
        <span className="label-caps label-caps--blue">Coaching brief</span>
        {brief.source === "ai" ? <Tag tone="blue">AI draft</Tag> : null}
      </h3>
      <p className="text-[15px] leading-normal text-ink-2">{brief.brief}</p>
      <p className="text-[15px] leading-normal text-ink-2">
        <span className="font-bold text-ink">Ask in your 1:1:</span> {brief.coachingQuestion}
      </p>
    </section>
  );
}

export function CoachingSignoffForm({
  tier,
  signoff,
  onStrengthChange,
  onGapChange,
  onNextActionChange,
  onConfidenceChange,
  onLiveAttestationChange,
  onAttestationNoteChange,
  decision = "approve",
  showErrors = true,
}: {
  tier: SignoffTier;
  signoff: CoachingSignoffInput;
  onStrengthChange: (value: string) => void;
  onGapChange: (value: string) => void;
  onNextActionChange: (value: string) => void;
  onConfidenceChange: (value: number | null) => void;
  onLiveAttestationChange: (value: boolean) => void;
  onAttestationNoteChange: (value: string) => void;
  decision?: "approve" | "reject";
  /** False until the reviewer tries to approve, so an untouched form isn't already red. */
  showErrors?: boolean;
}) {
  const validation = useMemo(
    () => validateCoachingSignoff(tier, signoff, decision),
    [tier, signoff, decision],
  );

  return (
    <section className="space-y-4 rounded-[14px] border border-line bg-white p-4">
      <h3 className="flex items-center gap-2">
        <span className="label-caps">Coaching sign-off</span>
        <Tag tone={TIER_TAG[tier].tone}>{TIER_TAG[tier].label}</Tag>
      </h3>
      <label className={LABEL_CLASS}>
        <span className="block">Strength observed</span>
        <textarea
          className={INPUT_CLASS}
          onChange={(event) => onStrengthChange(event.target.value)}
          placeholder="What they did well. Be specific."
          rows={4}
          value={signoff.strength}
        />
      </label>
      {tier !== "light" ? (
        <label className={LABEL_CLASS}>
          <span className="block">Gap to address</span>
          <textarea
            className={INPUT_CLASS}
            onChange={(event) => onGapChange(event.target.value)}
            placeholder="The highest-impact improvement area"
            rows={4}
            value={signoff.gap ?? ""}
          />
        </label>
      ) : null}
      <label className={LABEL_CLASS}>
        <span className="block">Concrete next action</span>
        <textarea
          className={INPUT_CLASS}
          onChange={(event) => onNextActionChange(event.target.value)}
          placeholder="What they should practice or do before the next milestone"
          rows={4}
          value={signoff.nextAction}
        />
      </label>
      {tier === "hard" && decision === "approve" ? (
        <>
          <label className={LABEL_CLASS}>
            <span className="block">Readiness confidence, 1 to 5</span>
            <select
              className={INPUT_CLASS}
              onChange={(event) =>
                onConfidenceChange(event.target.value ? Number(event.target.value) : null)
              }
              value={signoff.confidence ?? ""}
            >
              <option value="">Select a rating</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value}, {value >= 4 ? "field-ready" : value >= 3 ? "progressing" : "needs coaching"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-3 text-[15px] leading-normal text-ink-2">
            <Checkbox
              checked={signoff.liveAttestation ?? false}
              className="mt-0.5"
              onChange={(event) => onLiveAttestationChange(event.target.checked)}
            />
            <span>
              <span className="font-bold text-ink">Live coaching attestation.</span> I observed or coached them
              directly in a 1:1, call shadow or live review.
            </span>
          </label>
          {signoff.liveAttestation ? (
            <label className={LABEL_CLASS}>
              <span className="block">What you observed</span>
              <textarea
                className={INPUT_CLASS}
                onChange={(event) => onAttestationNoteChange(event.target.value)}
                placeholder="What you observed or coached in the live moment"
                rows={4}
                value={signoff.attestationNote ?? ""}
              />
            </label>
          ) : null}
        </>
      ) : null}
      {showErrors && !validation.ok && decision === "approve" ? (
        <ul className="space-y-1 rounded-[10px] bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
          {validation.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function isSignoffReady(tier: SignoffTier, signoff: CoachingSignoffInput, decision: "approve" | "reject") {
  return validateCoachingSignoff(tier, signoff, decision).ok;
}
