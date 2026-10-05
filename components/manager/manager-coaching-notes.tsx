"use client";

import { Loader2, Save, StickyNote } from "lucide-react";
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
 toast.error("Could not save notes.");
 return;
 }

 setSavedNotes(notes);
 toast.success("Coaching notes saved.");
 }

 return (
 <section className="rounded-[14px] border border-line bg-white p-4">
 <div className="flex items-center justify-between gap-2">
 <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
 <StickyNote aria-hidden className="h-4 w-4 text-blue" />
 Private coaching notes
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
 <p className="mt-1 text-sm text-muted">Only you see this — great for 1:1 prep and follow-ups.</p>
 <label className="mt-3 block">
 <span className="sr-only">Private coaching notes</span>
 <textarea
 className="w-full rounded-[10px] border-[1.5px] border-line-strong bg-white px-3 py-2.5 text-sm text-ink"
 onChange={(event) => setNotes(event.target.value)}
 placeholder="Observations, commitments, topics for next 1:1…"
 rows={4}
 value={notes}
 />
 </label>
 </section>
 );
}
