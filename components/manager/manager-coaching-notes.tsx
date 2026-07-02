"use client";

import { Loader2, Save, StickyNote } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
      toast.error("Could not save notes.");
      return;
    }

    setSavedNotes(notes);
    toast.success("Coaching notes saved.");
  }

  return (
    <section className="rounded-xl border border-sp-blue/15 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-sp-navy">
          <StickyNote className="h-4 w-4 text-sp-blue" />
          Private coaching notes
        </h3>
        {isDirty ? (
          <Button disabled={isSaving} onClick={() => void save()} size="sm">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-sp-navy-muted">Only you see this — great for 1:1 prep and follow-ups.</p>
      <Textarea
        className="mt-3"
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Observations, commitments, topics for next 1:1…"
        rows={4}
        value={notes}
      />
    </section>
  );
}
