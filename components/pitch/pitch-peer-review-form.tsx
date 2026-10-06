"use client";

import { Loader2, ThumbsUp } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { H2_CLS, LABEL_CLS, LINE_CARD_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
import { StatusPill } from "@/components/ui/status-pill";

function ScoreRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="float-left w-32 text-sm font-bold text-ink">{label}</legend>
      {[1, 2, 3, 4, 5].map((score) => {
        const active = value === score;
        return (
          <button
            aria-label={`${label} ${score} of 5`}
            aria-pressed={active}
            className={`h-9 min-w-9 rounded-[10px] px-2 text-sm font-semibold ${
              active ? "bg-ink text-white" : "border border-line-strong bg-white text-ink hover:bg-blue-soft"
            }`}
            key={score}
            onClick={() => onChange(score)}
            type="button"
          >
            {score}
          </button>
        );
      })}
    </fieldset>
  );
}

export function PitchPeerReviewForm({ pitchId }: { pitchId: string }) {
  const commentId = useId();
  const endorseId = useId();
  const [clarity, setClarity] = useState(4);
  const [storyline, setStoryline] = useState(4);
  const [differentiation, setDifferentiation] = useState(4);
  const [comment, setComment] = useState("");
  const [endorsed, setEndorsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<{ endorsed: boolean } | null>(null);

  useEffect(() => {
    void fetch(`/api/pitch/peer-reviews?pitchId=${pitchId}`)
      .then((response) => (response.ok ? response.json() : { reviews: [] }))
      .then((body: { reviews: Array<{ reviewer_id: string; endorsed: boolean }> }) => {
        if (body.reviews.length > 0) setExisting({ endorsed: body.reviews[0]!.endorsed });
      });
  }, [pitchId]);

  async function submit() {
    setSaving(true);
    const response = await fetch("/api/pitch/peer-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pitchId,
        clarityScore: clarity,
        storylineScore: storyline,
        differentiationScore: differentiation,
        comment,
        endorsed,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not save peer review.");
      return;
    }
    toast.success(endorsed ? "Endorsed — added to mentor picks" : "Peer feedback saved.");
    setExisting({ endorsed });
  }

  if (existing) {
    return (
      <div className={`${LINE_CARD_CLS} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
        <h2 className={H2_CLS}>Your peer review</h2>
        <span role="status">
          <StatusPill tone={existing.endorsed ? "success" : "blue"}>
            {existing.endorsed ? "Endorsed" : "Feedback submitted"}
          </StatusPill>
        </span>
      </div>
    );
  }

  return (
    <div className={LINE_CARD_CLS}>
      <div className="border-b border-divider px-5 py-4">
        <h2 className={H2_CLS}>Peer review</h2>
        <p className="mt-1 text-sm text-ink-2">Score it against the rubric. Your feedback goes to the presenter only.</p>
      </div>
      <div className="space-y-4 px-5 py-4">
        <ScoreRow label="Clarity" onChange={setClarity} value={clarity} />
        <ScoreRow label="Storyline" onChange={setStoryline} value={storyline} />
        <ScoreRow label="Differentiation" onChange={setDifferentiation} value={differentiation} />
        <div className="space-y-1.5">
          <label className={LABEL_CLS} htmlFor={commentId}>
            Comment
          </label>
          <textarea
            className={TEXTAREA_CLS}
            id={commentId}
            onChange={(e) => setComment(e.target.value)}
            placeholder="One thing they nailed, one upgrade…"
            rows={2}
            value={comment}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            checked={endorsed}
            className="h-4 w-4 rounded-xs accent-blue"
            id={endorseId}
            onChange={(e) => setEndorsed(e.target.checked)}
            type="checkbox"
          />
          <label className="flex items-center gap-2 text-sm text-ink" htmlFor={endorseId}>
            <ThumbsUp aria-hidden="true" className="h-4 w-4 text-blue" />
            Endorse for peer library (mentor pick)
          </label>
        </div>
        <button
          className="btn-primary inline-flex items-center gap-2"
          disabled={saving}
          onClick={() => void submit()}
          type="button"
        >
          {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Submit peer review"}
        </button>
      </div>
    </div>
  );
}
