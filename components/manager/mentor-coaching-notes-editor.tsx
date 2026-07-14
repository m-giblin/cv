"use client";

import { Loader2, Save, StickyNote } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
    <section className="border border-[#E2DFD9] bg-[#F9F8F6] p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#0D0E12]">
          <StickyNote className="h-4 w-4 text-[#5b21b6]" />
          Mentor coaching notes
        </h3>
        {isDirty ? (
          <Button disabled={isSaving} onClick={() => void save()} size="sm">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-[#6B6860]">
        Shared with the SE&apos;s hiring manager — observations, ramp risks, and coaching context.
      </p>
      {isLoading ? (
        <div className="mt-3 flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#5b21b6]" />
        </div>
      ) : (
        <Textarea
          className="mt-3 bg-white"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ramp observations, strengths to reinforce, areas needing manager attention…"
          rows={4}
          value={notes}
        />
      )}
    </section>
  );
}
