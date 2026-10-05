"use client";

import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";

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
      <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
        <MessageSquare aria-hidden className="h-4 w-4 text-blue" />
        Mentor notes from {mentorName}
      </h3>
      <p className="mt-1 font-mono text-xs text-muted">
        Shared by assigned mentor
        {updatedAt ? ` · updated ${formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}` : ""}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{notes}</p>
    </section>
  );
}
