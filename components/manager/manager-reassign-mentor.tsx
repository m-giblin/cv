"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { Profile } from "@/lib/types";

export function ManagerReassignMentor({
  assignmentId,
  currentMentorId,
  mentors,
  seName,
}: {
  assignmentId: string;
  currentMentorId?: string | null;
  mentors: Profile[];
  seName: string;
}) {
  const router = useRouter();
  const [mentorId, setMentorId] = useState(currentMentorId ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = mentorId !== (currentMentorId ?? "");

  async function save() {
    setIsSaving(true);
    const response = await fetch(`/api/plans/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentorId: mentorId || null }),
    });
    setIsSaving(false);

    if (!response.ok) {
      toast.error("Couldn't update the mentor");
      return;
    }

    toast.success(`Mentor updated for ${seName}`);
    router.refresh();
  }

  return (
    <section className="rounded-[14px] border border-line bg-white p-4">
      <h3 className="text-[15px] font-bold text-ink">Assigned mentor</h3>
      <p className="mt-1 text-sm text-muted">
        Mentors endorse check-ins. You keep the final sign-off on ramp steps.
      </p>
      <div className="mt-3 space-y-3">
        <label className="block space-y-1.5 text-sm font-semibold text-ink">
          <span className="block">Mentor</span>
          <select
            className="w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] font-normal text-ink"
            onChange={(event) => setMentorId(event.target.value)}
            value={mentorId}
          >
            <option value="">No mentor assigned</option>
            {mentors.map((mentor) => (
              <option key={mentor.id} value={mentor.id}>
                {mentor.fullName}
              </option>
            ))}
          </select>
        </label>
        {isDirty ? (
          <button
            className="btn-secondary inline-flex items-center gap-1.5 disabled:opacity-50"
            disabled={isSaving}
            onClick={() => void save()}
            type="button"
          >
            {isSaving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            Save mentor
          </button>
        ) : null}
      </div>
    </section>
  );
}
