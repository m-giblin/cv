"use client";

import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type PlanStepReviewItem = {
  assignmentStepId: string;
  title: string;
  personName: string;
  stepType: string;
  notes?: string;
};

export function PlanStepReviewPanel({ items }: { items: PlanStepReviewItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function reviewStep(assignmentStepId: string, decision: "approve" | "reject") {
    if (feedback.trim().length < 3) {
      toast.error("Add feedback before submitting your review.");
      return;
    }

    setIsSaving(true);
    const response = await fetch(`/api/plans/steps/${assignmentStepId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, feedback: feedback.trim() }),
    });

    if (!response.ok) {
      toast.error("Review failed.");
      setIsSaving(false);
      return;
    }

    toast.success(decision === "approve" ? "Step approved." : "Sent back for revision.");
    setActiveId(null);
    setFeedback("");
    setIsSaving(false);
    window.location.reload();
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div className="rounded-2xl border border-amber-200/80 bg-white p-4" key={item.assignmentStepId}>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-bold text-sp-navy">{item.personName}</p>
              <p className="mt-1 text-xs text-sp-navy-muted">
                Plan step • {item.stepType.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-sm text-sp-navy">{item.title}</p>
              <Badge className="mt-2" tone="amber">
                Awaiting validation
              </Badge>
            </div>
            <Button
              onClick={() => setActiveId(activeId === item.assignmentStepId ? null : item.assignmentStepId)}
              size="sm"
              variant="outline"
            >
              Review
            </Button>
          </div>

          {activeId === item.assignmentStepId ? (
            <div className="mt-4 space-y-3 border-t border-sp-blue/10 pt-4">
              <Textarea
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Feedback for the SE — approve if ready, or explain what to redo…"
                value={feedback}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={isSaving || feedback.length < 3}
                  onClick={() => void reviewStep(item.assignmentStepId, "approve")}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve step
                </Button>
                <Button
                  disabled={isSaving || feedback.length < 3}
                  onClick={() => void reviewStep(item.assignmentStepId, "reject")}
                  variant="outline"
                >
                  <RotateCcw className="h-4 w-4" />
                  Needs revision
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
