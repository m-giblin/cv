"use client";

import { formatDistanceToNow } from "date-fns";

export function MentorNotesForManager({
  mentorName,
  notes,
  updatedAt,
}: {
  mentorName: string;
  notes: string;
  updatedAt: string;
}) {
  if (!notes.trim()) {
    return null;
  }

  return (
    <section className="rounded-[14px] border border-line bg-white p-4">
      <h3 className="text-[15px] font-bold text-ink">Notes from {mentorName}</h3>
      <p className="mt-1 text-[13px] text-muted">
        {updatedAt
          ? `Shared by their mentor, updated ${formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}.`
          : "Shared by their mentor."}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{notes}</p>
    </section>
  );
}
