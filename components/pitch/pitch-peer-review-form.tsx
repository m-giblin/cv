"use client";

import { Loader2, Star, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SP_BLUE_BTN } from "@/components/se/sp-form-primitives";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export function PitchPeerReviewForm({ pitchId }: { pitchId: string }) {
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
      <div className="rounded-xl border border-[#e2eaf5] bg-white p-6">
        <h2 className="text-sm font-semibold text-[#0a1628]">Your peer review</h2>
        <p className="mt-1 text-sm text-[#64748b]">
          {existing.endorsed ? "You endorsed this pitch" : "Feedback submitted"}
        </p>
      </div>
    );
  }

  function ScoreRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-28 text-xs font-semibold text-sp-navy">{label}</span>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            className={`rounded-lg border px-2 py-0.5 text-xs font-semibold ${
              value === score ? "border-sp-blue bg-sp-blue-soft text-sp-blue-deep" : "border-stone-200"
            }`}
            key={score}
            onClick={() => onChange(score)}
            type="button"
          >
            {score}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e2eaf5] bg-white">
      <div className="border-b border-[#f1f5f9] p-6">
        <h2 className="text-base font-semibold text-[#0a1628]">Peer review</h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Structured rubric — Allego-style feedback without the social feed noise.
        </p>
      </div>
      <div className="space-y-3 px-6 pb-6 pt-4">
        <ScoreRow label="Clarity" onChange={setClarity} value={clarity} />
        <ScoreRow label="Storyline" onChange={setStoryline} value={storyline} />
        <ScoreRow label="Differentiation" onChange={setDifferentiation} value={differentiation} />
        <Textarea onChange={(e) => setComment(e.target.value)} placeholder="One thing they nailed, one upgrade…" rows={2} value={comment} />
        <label className="flex items-center gap-2 text-sm">
          <input checked={endorsed} onChange={(e) => setEndorsed(e.target.checked)} type="checkbox" />
          <ThumbsUp className="h-4 w-4 text-sp-blue" />
          Endorse for peer library (mentor pick)
        </label>
        <button className={SP_BLUE_BTN} disabled={saving} onClick={() => void submit()} type="button">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit peer review"}
        </button>
      </div>
    </div>
  );
}
