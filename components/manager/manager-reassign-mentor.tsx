"use client";

import { Loader2, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
      toast.error("Could not update mentor assignment.");
      return;
    }

    toast.success(`Mentor updated for ${seName}.`);
    router.refresh();
  }

  return (
    <section className="border border-[#E2DFD9] bg-white p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-[#0D0E12]">
        <UserRoundCog className="h-4 w-4 text-[#0071ce]" />
        Assigned mentor
      </h3>
      <p className="mt-1 text-xs text-[#6B6860]">
        Mentors endorse check-ins; you retain final sign-off on ramp steps.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#A09D98]">
            Mentor
          </label>
          <select
            className="w-full border border-[#E2DFD9] bg-white px-3 py-2 text-sm text-[#0D0E12]"
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
        </div>
        {isDirty ? (
          <Button disabled={isSaving} onClick={() => void save()} size="sm">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
