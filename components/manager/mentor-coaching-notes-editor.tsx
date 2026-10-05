"use client";

import { Loader2, Save, StickyNote } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function MentorCoachingNotesEditor({ seUserId }: { seUserId: string }) {
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void fetch(`/api/mentor/coaching-notes?seUserId=${encodeURIComponent(seUserId)}`)
      .then((response) => (response.ok ? response.json() : { notes: "" }))
      .then((body: { notes?: string }) => {
        if (cancelled) return;
        const loaded = body.notes ?? "";
        setNotes(loaded);
        setSavedNotes(loaded);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seUserId]);

  const isDirty = notes !== savedNotes;

  async function save() {
    setIsSaving(true);
    const response = await fetch("/api/mentor/coaching-notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seUserId, notes }),
    });
    setIsSaving(false);

    if (!response.ok) {
      toast.error("Could not save mentor notes.");
      return;
    }

    setSavedNotes(notes);
    toast.success("Mentor notes saved — visible to the SE's manager.");
  }

  return (
    <section className="rounded-[14px] border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <StickyNote aria-hidden className="h-4 w-4 text-blue" />
          Mentor coaching notes
        </h3>
        {isDirty ? (
          <button
            className="btn-secondary inline-flex items-center gap-1.5 px-3.5 py-1.5 disabled:opacity-50"
            disabled={isSaving}
            onClick={() => void save()}
            type="button"
          >
            {isSaving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Save aria-hidden className="h-4 w-4" />}
            Save
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted">
        Shared with the SE&apos;s hiring manager — observations, ramp risks, and coaching context.
      </p>
      {isLoading ? (
        <div className="mt-3 flex justify-center py-4" role="status">
          <Loader2 aria-hidden className="h-5 w-5 animate-spin text-blue" />
          <span className="sr-only">Loading notes…</span>
        </div>
      ) : (
        <label className="mt-3 block">
          <span className="sr-only">Mentor coaching notes</span>
          <textarea
            className="w-full rounded-[10px] border-[1.5px] border-line-strong bg-white px-3 py-2.5 text-sm text-ink"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ramp observations, strengths to reinforce, areas needing manager attention…"
            rows={4}
            value={notes}
          />
        </label>
      )}
    </section>
  );
}
