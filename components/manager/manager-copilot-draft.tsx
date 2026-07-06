"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ManagerCopilotDraft({
  strengths,
  gaps,
  transcript,
  context,
  onDraft,
}: {
  strengths?: string[];
  gaps?: string[];
  transcript?: string;
  context?: string;
  onDraft: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDraft() {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/manager-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ strengths: strengths ?? [], gaps: gaps ?? [], transcript, context }),
      });

      if (!response.ok) {
        toast.error("Could not draft feedback.");
        return;
      }

      const body = (await response.json()) as { draft: string };
      onDraft(body.draft);
      toast.success("Draft ready — edit before sending.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button disabled={loading} onClick={() => void handleDraft()} size="sm" type="button" variant="outline">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      Draft feedback (co-pilot)
    </Button>
  );
}
