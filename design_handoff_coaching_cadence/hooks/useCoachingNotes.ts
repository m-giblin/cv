// ============================================================
// hooks/useCoachingNotes.ts — Note persistence + merge hook
// ============================================================
import { useState, useEffect } from 'react';
import type { SavedNote } from '../types';

const STORAGE_KEY = 'cc_notes';

export function useCoachingNotes() {
  const [notes, setNotes] = useState<Record<string, SavedNote[]>>({});

  useEffect(() => {
    // Load from localStorage on mount
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch {}
    // TODO: fetch from API and merge:
    // GET /api/coaching-notes?managerId={managerId}
    // setNotes(groupBySeId(apiResponse.notes))
  }, []);

  function addNote(seId: string, note: SavedNote) {
    setNotes(prev => {
      const updated = { ...prev, [seId]: [note, ...(prev[seId] || [])] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      // TODO: POST /api/coaching-notes { seId, note }
      return updated;
    });
  }

  function getNotesForSE(seId: string): SavedNote[] {
    return notes[seId] || [];
  }

  return { notes, addNote, getNotesForSE };
}
