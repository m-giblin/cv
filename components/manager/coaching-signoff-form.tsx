"use client";

import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SignoffTier } from "@/lib/coaching/signoff-policy";
import type { CoachingSignoffInput } from "@/lib/coaching/signoff-validation";
import { validateCoachingSignoff } from "@/lib/coaching/signoff-validation";

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
      <div className="flex items-center gap-2 border-l-[3px] border-[#0071ce] bg-[#EEF4FF] px-3 py-2 text-[11px] text-[#0071ce]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Preparing coaching brief…
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="space-y-2 border-l-[3px] border-[#0071ce] bg-[#EEF4FF] px-3 py-2.5">
      <p className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#0071ce]">
        <Sparkles className="h-3 w-3" />
        Coaching brief {brief.source === "ai" ? "· AI" : ""}
      </p>
      <p className="text-[11.5px] leading-relaxed text-[#0D0E12]">{brief.brief}</p>
      <p className="text-[10.5px] italic text-[#3D3C38]">1:1 question: {brief.coachingQuestion}</p>
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
    <div className="space-y-2.5 border border-[#E2DFD9] bg-[#F9F8F6] p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#6B6860]">
        <ShieldCheck className="h-3.5 w-3.5 text-[#0071ce]" />
        Coaching sign-off {tier === "hard" ? "· gate" : tier === "standard" ? "· required" : "· light"}
      </p>
      <label className="block text-[10px] font-semibold text-[#3D3C38]">
        Strength observed
        <textarea
          className="mt-1 w-full border border-[#D4D1CB] bg-white px-2 py-1.5 text-[11px]"
          onChange={(event) => onStrengthChange(event.target.value)}
          placeholder="What did they do well — be specific…"
          rows={2}
          value={signoff.strength}
        />
      </label>
      {tier !== "light" ? (
        <label className="block text-[10px] font-semibold text-[#3D3C38]">
          Gap to address
          <textarea
            className="mt-1 w-full border border-[#D4D1CB] bg-white px-2 py-1.5 text-[11px]"
            onChange={(event) => onGapChange(event.target.value)}
            placeholder="Highest-impact improvement area…"
            rows={2}
            value={signoff.gap ?? ""}
          />
        </label>
      ) : null}
      <label className="block text-[10px] font-semibold text-[#3D3C38]">
        Next action (concrete)
        <textarea
          className="mt-1 w-full border border-[#D4D1CB] bg-white px-2 py-1.5 text-[11px]"
          onChange={(event) => onNextActionChange(event.target.value)}
          placeholder="What they should practice or do before the next milestone…"
          rows={2}
          value={signoff.nextAction}
        />
      </label>
      {tier === "hard" && decision === "approve" ? (
        <>
          <label className="block text-[10px] font-semibold text-[#3D3C38]">
            Readiness confidence (1–5)
            <select
              className="mt-1 w-full border border-[#D4D1CB] bg-white px-2 py-1.5 text-[11px]"
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
          <label className="flex items-start gap-2 text-[10px] text-[#3D3C38]">
            <input
              checked={signoff.liveAttestation ?? false}
              className="mt-0.5"
              onChange={(event) => onLiveAttestationChange(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="font-semibold">Live coaching attestation</span> — I observed or coached them
              directly (1:1, call shadow, or live review).
            </span>
          </label>
          {signoff.liveAttestation ? (
            <textarea
              className="w-full border border-[#D4D1CB] bg-white px-2 py-1.5 text-[11px]"
              onChange={(event) => onAttestationNoteChange(event.target.value)}
              placeholder="What you observed or coached in the live moment…"
              rows={2}
              value={signoff.attestationNote ?? ""}
            />
          ) : null}
        </>
      ) : null}
      {!validation.ok && decision === "approve" ? (
        <ul className="space-y-0.5 text-[10px] text-[#B83128]">
          {validation.errors.map((error) => (
            <li key={error}>• {error}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function isSignoffReady(tier: SignoffTier, signoff: CoachingSignoffInput, decision: "approve" | "reject") {
  return validateCoachingSignoff(tier, signoff, decision).ok;
}
