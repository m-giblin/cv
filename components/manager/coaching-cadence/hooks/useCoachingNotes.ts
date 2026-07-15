"use client";

import { useCallback, useEffect, useState } from "react";
import type { SavedNote } from "../types";

const STORAGE_KEY = "cc_notes";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapApiNote(row: {
  id: string;
  session_focus: string;
  note: string;
  outcome_label: string;
  created_at: string;
}): SavedNote {
  const created = new Date(row.created_at);
  return {
    seId: "",
    date: created.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    dow: created.toLocaleDateString("en-US", { weekday: "short" }),
    focus: row.session_focus,
    note: row.note,
    outcomeLabel: row.outcome_label as SavedNote["outcomeLabel"],
    outcomeColor: "#0071CE",
    outcomeBg: "rgba(0,113,206,.08)",
    delta: "—",
    deltaColor: "#A09D98",
  };
}

export function useCoachingNotes(activeSeId: string | null) {
  const [notes, setNotes] = useState<Record<string, SavedNote[]>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setNotes(JSON.parse(raw) as Record<string, SavedNote[]>);
    } catch {
      /* ignore corrupt localStorage */
    }
  }, []);

  useEffect(() => {
    if (!activeSeId || !isUuid(activeSeId)) {
      return;
    }

    let cancelled = false;

    void fetch(`/api/coaching-notes?seId=${encodeURIComponent(activeSeId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { notes?: Array<Parameters<typeof mapApiNote>[0]> } | null) => {
        if (cancelled || !payload?.notes) {
          return;
        }
        setNotes((prev) => ({
          ...prev,
          [activeSeId]: payload.notes!.map((row) => ({ ...mapApiNote(row), seId: activeSeId })),
        }));
      })
      .catch(() => {
        /* keep local/mock notes */
      });

    return () => {
      cancelled = true;
    };
  }, [activeSeId]);

  const addNote = useCallback(async (seId: string, note: SavedNote) => {
    setNotes((prev) => {
      const updated = { ...prev, [seId]: [note, ...(prev[seId] || [])] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        /* ignore quota errors */
      }
      return updated;
    });

    if (!isUuid(seId)) {
      return;
    }

    await fetch("/api/coaching-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seId,
        note: note.note,
        sessionFocus: note.focus,
        outcomeLabel: note.outcomeLabel,
      }),
    }).catch(() => {
      /* local state already updated */
    });
  }, []);

  function getNotesForSE(seId: string): SavedNote[] {
    return notes[seId] || [];
  }

  return { notes, addNote, getNotesForSE };
}
