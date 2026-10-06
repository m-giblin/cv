"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ManagerCoachingNotes({
  seUserId,
  initialNotes,
}: {
  seUserId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotes(initialNotes);
    setSavedNotes(initialNotes);
  }, [initialNotes, seUserId]);

  const isDirty = notes !== savedNotes;

  async function save() {
    setIsSaving(true);
    const response = await fetch("/api/manager/coaching-notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seUserId, notes }),
    });

    setIsSaving(false);

    if (!response.ok) {
      toast.error("Couldn't save your notes");
      return;
    }

    setSavedNotes(notes);
    toast.success("Coaching notes saved");
  }

  return (
    <section className="rounded-[14px] border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold text-ink">Private coaching notes</h3>
        {isDirty ? (
          <button
            className="btn-secondary inline-flex items-center gap-1.5 disabled:opacity-50"
            disabled={isSaving}
            onClick={() => void save()}
            type="button"
          >
            {isSaving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            Save notes
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted">Only you can see these. Use them for 1:1 prep and follow-ups.</p>
      <label className="mt-3 block">
        <span className="sr-only">Private coaching notes</span>
        <textarea
          className="w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] text-ink"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Observations, commitments and topics for the next 1:1"
          rows={4}
          value={notes}
        />
      </label>
    </section>
  );
}
