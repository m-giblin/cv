"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import type { PlanStep } from "@/lib/types";

const CARD_CLS = "flex flex-col gap-3 rounded-[14px] border border-line bg-white p-4";

/** Approve or send back an everyday step the mentee submitted. Their manager signs off the stage gates. */
export function StepApprovalPanel({ step, firstName }: { step: PlanStep; firstName: string }) {
  const router = useRouter();
  const noteId = useId();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function decide(decision: "approve" | "reject") {
    if (!step.assignmentStepId) return;
    if (decision === "reject" && note.trim().length < 3) {
      toast.error(`Say what ${firstName} should change.`);
      return;
    }
    setBusy(decision);
    const response = await fetch(`/api/mentor/steps/${step.assignmentStepId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, feedback: note.trim() || undefined }),
    });
    setBusy(null);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Couldn't save the review.");
      return;
    }
    toast.success(decision === "approve" ? `Approved. ${firstName} has been told.` : `Sent back to ${firstName}.`);
    setNote("");
    router.refresh();
  }

  return (
    <section className={`${CARD_CLS} border-blue`}>
      <h3 className="text-[17px] font-extrabold text-ink">Your review</h3>
      <p className="text-[15px] text-ink-2">
        Compare what {firstName} submitted with the strong attempt. Approve it, or send it back with one thing to change.
      </p>
      <label className="text-sm font-bold text-ink" htmlFor={noteId}>
        Note to {firstName} (needed to send back)
      </label>
      <textarea
        className="min-h-[90px] rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] text-ink"
        id={noteId}
        onChange={(event) => setNote(event.target.value)}
        placeholder="What was strong, and one thing to sharpen"
        value={note}
      />
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary inline-flex items-center gap-2" disabled={busy !== null} onClick={() => void decide("approve")} type="button">
          {busy === "approve" ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          Approve
        </button>
        <button className="btn-secondary inline-flex items-center gap-2" disabled={busy !== null} onClick={() => void decide("reject")} type="button">
          {busy === "reject" ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          Send back
        </button>
      </div>
    </section>
  );
}
