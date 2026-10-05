"use client";

import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SignoffTier } from "@/lib/coaching/signoff-policy";
import type { CoachingSignoffInput } from "@/lib/coaching/signoff-validation";
import { validateCoachingSignoff } from "@/lib/coaching/signoff-validation";

const INPUT_CLASS =
  "w-full rounded-[10px] border-[1.5px] border-line-strong bg-white px-3 py-2.5 text-sm font-normal text-ink";
const LABEL_CLASS = "block space-y-1.5 text-sm font-bold text-ink";

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
        Preparing coaching brief…
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="space-y-2 rounded-[14px] bg-blue-soft px-4 py-3">
      <p className="label-mono flex items-center gap-1.5">
        <Sparkles aria-hidden className="h-3.5 w-3.5 text-blue" />
        Coaching brief {brief.source === "ai" ? "· AI" : ""}
      </p>
      <p className="text-sm leading-relaxed text-ink">{brief.brief}</p>
      <p className="text-sm text-ink-2">
        <span className="font-bold">1:1 question:</span> {brief.coachingQuestion}
      </p>
    </div>
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
}) {
  const validation = useMemo(
    () => validateCoachingSignoff(tier, signoff, decision),
    [tier, signoff, decision],
  );

  return (
    <div className="space-y-4 rounded-[14px] border border-line bg-white p-4">
      <p className="label-mono flex items-center gap-1.5">
        <ShieldCheck aria-hidden className="h-4 w-4 text-blue" />
        Coaching sign-off {tier === "hard" ? "· gate" : tier === "standard" ? "· required" : "· light"}
      </p>
      <label className={LABEL_CLASS}>
        <span className="block">Strength observed</span>
        <textarea
          className={INPUT_CLASS}
          onChange={(event) => onStrengthChange(event.target.value)}
          placeholder="What did they do well — be specific…"
          rows={2}
          value={signoff.strength}
        />
      </label>
      {tier !== "light" ? (
        <label className={LABEL_CLASS}>
          <span className="block">Gap to address</span>
          <textarea
            className={INPUT_CLASS}
            onChange={(event) => onGapChange(event.target.value)}
            placeholder="Highest-impact improvement area…"
            rows={2}
            value={signoff.gap ?? ""}
          />
        </label>
      ) : null}
      <label className={LABEL_CLASS}>
        <span className="block">Next action (concrete)</span>
        <textarea
          className={INPUT_CLASS}
          onChange={(event) => onNextActionChange(event.target.value)}
          placeholder="What they should practice or do before the next milestone…"
          rows={2}
          value={signoff.nextAction}
        />
      </label>
      {tier === "hard" && decision === "approve" ? (
        <>
          <label className={LABEL_CLASS}>
            <span className="block">Readiness confidence (1–5)</span>
            <select
              className={INPUT_CLASS}
              onChange={(event) =>
                onConfidenceChange(event.target.value ? Number(event.target.value) : null)
              }
              value={signoff.confidence ?? ""}
            >
              <option value="">Select…</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} — {value >= 4 ? "field-ready" : value >= 3 ? "progressing" : "needs coaching"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-ink-2">
            <input
              checked={signoff.liveAttestation ?? false}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-blue)]"
              onChange={(event) => onLiveAttestationChange(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="font-bold text-ink">Live coaching attestation</span> — I observed or coached them
              directly (1:1, call shadow, or live review).
            </span>
          </label>
          {signoff.liveAttestation ? (
            <label className={LABEL_CLASS}>
              <span className="block">What you observed</span>
              <textarea
                className={INPUT_CLASS}
                onChange={(event) => onAttestationNoteChange(event.target.value)}
                placeholder="What you observed or coached in the live moment…"
                rows={2}
                value={signoff.attestationNote ?? ""}
              />
            </label>
          ) : null}
        </>
      ) : null}
      {!validation.ok && decision === "approve" ? (
        <ul className="space-y-1 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
          {validation.errors.map((error) => (
            <li key={error}>▲ {error}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function isSignoffReady(tier: SignoffTier, signoff: CoachingSignoffInput, decision: "approve" | "reject") {
  return validateCoachingSignoff(tier, signoff, decision).ok;
}
