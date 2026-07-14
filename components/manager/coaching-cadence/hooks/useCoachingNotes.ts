import { useEffect, useState } from "react";
import type { SavedNote } from "../types";

const STORAGE_KEY = "cc_notes";

export function useCoachingNotes() {
  const [notes, setNotes] = useState<Record<string, SavedNote[]>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setNotes(JSON.parse(raw) as Record<string, SavedNote[]>);
    } catch {
      // ignore corrupt localStorage
    }
    // TODO: fetch from API and merge:
    // GET /api/coaching-notes?managerId={managerId}
  }, []);

  function addNote(seId: string, note: SavedNote) {
    setNotes((prev) => {
      const updated = { ...prev, [seId]: [note, ...(prev[seId] || [])] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore quota errors
      }
      // TODO: POST /api/coaching-notes { seId, note }
      return updated;
    });
  }

  function getNotesForSE(seId: string): SavedNote[] {
    return notes[seId] || [];
  }

  return { notes, addNote, getNotesForSE };
}
