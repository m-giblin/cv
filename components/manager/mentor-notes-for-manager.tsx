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
    <section className="border border-[#E2DFD9] bg-[#faf5ff] p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-[#0D0E12]">
        <MessageSquare className="h-4 w-4 text-[#5b21b6]" />
        Mentor notes from {mentorName}
      </h3>
      <p className="mt-1 text-xs text-[#6B6860]">
        Shared by assigned mentor
        {updatedAt ? ` · updated ${formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}` : ""}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#374151]">{notes}</p>
    </section>
  );
}
