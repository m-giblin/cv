"use client";

import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { PlanStep } from "@/lib/types";

export function ShadowLogQuickCard({ shadowStep }: { shadowStep?: PlanStep }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (notes.trim().length < 10) {
      toast.error("Add a few sentences about what you learned.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/shadow-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: notes.trim(),
        assignmentStepId: shadowStep?.assignmentStepId ?? undefined,
      }),
    });
    setSaving(false);

    if (!response.ok) {
      toast.error("Could not save shadow log.");
      return;
    }

    toast.success(shadowStep ? "Shadow log saved — step updated." : "Shadow notes saved.");
    setNotes("");
    router.refresh();
  }

  return (
    <div className="ns-card ns-card-peach p-4">
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-[#0033a1]" />
        <h2 className="text-sm font-bold text-stone-900">Shadow log</h2>
      </div>
      <p className="mt-2 text-xs text-stone-600">
        {shadowStep
          ? `Linked to: ${shadowStep.title}`
          : "Log takeaways from a shadow session — business pain, what landed, follow-ups."}
      </p>
      <textarea
        className="mt-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400"
        onChange={(event) => setNotes(event.target.value)}
        placeholder="CISO cared about audit readiness. Demo on access reviews resonated…"
        rows={3}
        value={notes}
      />
      <button
        className="mt-2 rounded-lg border border-[#0033a1]/25 bg-white px-3 py-1.5 text-xs font-semibold text-[#0033a1] disabled:opacity-50"
        disabled={saving}
        onClick={() => void handleSave()}
        type="button"
      >
        {saving ? "Saving…" : "Save shadow notes"}
      </button>
    </div>
  );
}
