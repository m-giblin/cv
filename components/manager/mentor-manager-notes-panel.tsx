"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ManagerNote } from "@/lib/mentoring/mentor-records-model";

type Note = ManagerNote & { menteeName: string };

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Notes from mentors, shown until the manager marks them read. */
export function MentorManagerNotesPanel() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/mentor/manager-notes")
      .then((response) => (response.ok ? response.json() : { notes: [] }))
      .then((body: { notes?: Note[] }) => setNotes(body.notes ?? []))
      .catch(() => undefined);
  }, []);

  async function acknowledge(note: Note) {
    setBusy(note.id);
    const response = await fetch("/api/mentor/manager-notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: note.id }),
    }).catch(() => null);
    setBusy(null);
    if (!response?.ok) {
      toast.error("Could not mark that note read.");
      return;
    }
    setNotes((current) => current.filter((item) => item.id !== note.id));
    toast.success("Noted.");
    router.refresh();
  }

  if (notes.length === 0) return null;
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5">
      <h2 className="text-lg font-extrabold text-ink">From mentors</h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {notes.map((note) => (
          <li className="flex flex-wrap items-start justify-between gap-3 border-b border-divider pb-3 last:border-b-0 last:pb-0" key={note.id}>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-bold text-ink">
                {note.authorName} on {note.menteeName}
                <span className="font-normal text-muted"> · {shortDate(note.createdAt)}</span>
              </p>
              <p className="text-sm text-ink-2">
                <span className="font-bold text-ink">Strength. </span>
                {note.strength}
              </p>
              <p className="text-sm text-ink-2">
                <span className="font-bold text-ink">Risk. </span>
                {note.risk}
              </p>
              <p className="text-sm text-ink-2">
                <span className="font-bold text-ink">Doing. </span>
                {note.action}
              </p>
            </div>
            <button className="btn-secondary shrink-0" disabled={busy === note.id} onClick={() => void acknowledge(note)} type="button">
              Noted
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
