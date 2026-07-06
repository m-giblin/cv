"use client";

import { Loader2, MessageCircleQuestion } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CorpusFeedbackWidget({
  contentAssetId,
  assetTitle,
}: {
  contentAssetId: string;
  assetTitle: string;
}) {
  const [comment, setComment] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(confusing: boolean) {
    setLoading(true);
    try {
      const response = await fetch("/api/corpus/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentAssetId,
          isConfusing: confusing,
          comment: comment.trim() || undefined,
          question: question.trim() || undefined,
        }),
      });
      if (!response.ok) {
        toast.error("Could not send feedback.");
        return;
      }
      const body = (await response.json()) as { routed?: boolean };
      toast.success(
        body.routed
          ? "Feedback sent — your question was routed to the SME channel."
          : "Thanks — feedback recorded for admin review.",
      );
      setComment("");
      setQuestion("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold text-stone-800">
        <MessageCircleQuestion className="h-4 w-4 text-[#0071ce]" />
        Feedback on: {assetTitle}
      </p>
      <Textarea
        className="mt-2 bg-white"
        onChange={(event) => setComment(event.target.value)}
        placeholder="What's confusing about this resource?"
        rows={2}
        value={comment}
      />
      <Textarea
        className="mt-2 bg-white"
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask a question (routes to SME by project tag)…"
        rows={2}
        value={question}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button disabled={loading} onClick={() => void submit(true)} size="sm" type="button" variant="secondary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Flag confusing"}
        </Button>
        <Button
          disabled={loading || !question.trim()}
          onClick={() => void submit(false)}
          size="sm"
          type="button"
        >
          Ask SME
        </Button>
      </div>
    </div>
  );
}
