"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function ManagerCopilotDraft({
  strengths,
  gaps,
  transcript,
  context,
  managerSummary,
  recommendedImprovements,
  autoDraft = false,
  onDraft,
}: {
  strengths?: string[];
  gaps?: string[];
  transcript?: string;
  context?: string;
  managerSummary?: string;
  recommendedImprovements?: string[];
  /** When true, drafts feedback once on mount using the session brief (not the full transcript). */
  autoDraft?: boolean;
  onDraft: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const autoRan = useRef(false);

  async function handleDraft() {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/manager-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          strengths: strengths ?? [],
          gaps: gaps ?? [],
          managerSummary,
          recommendedImprovements: recommendedImprovements ?? [],
          context,
          // Only send transcript when manager explicitly re-drafts without a brief.
          transcript: managerSummary ? undefined : transcript,
        }),
      });

      if (!response.ok) {
        toast.error("Could not draft feedback.");
        return;
      }

      const body = (await response.json()) as { draft: string };
      onDraft(body.draft);
      if (!autoDraft) {
        toast.success("Draft ready. Edit it before sending.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoDraft || autoRan.current) return;
    autoRan.current = true;
    void handleDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDraft]);

  return (
    <button
      className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
      disabled={loading}
      onClick={() => void handleDraft()}
      type="button"
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden className="h-4 w-4" />}
      {autoDraft && loading ? "Drafting feedback…" : "Redraft with AI"}
    </button>
  );
}
