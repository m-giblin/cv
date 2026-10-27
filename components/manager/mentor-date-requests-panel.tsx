"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { DateProposal } from "@/lib/mentoring/mentor-records-model";

type Request = DateProposal & { menteeName: string };

function shortDate(iso: string | null) {
  if (!iso) return "no date";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Due-date changes mentors have asked for. Approving moves the date; declining leaves it. */
export function MentorDateRequestsPanel() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/mentor/due-date-proposals")
      .then((response) => (response.ok ? response.json() : { proposals: [] }))
      .then((body: { proposals?: Request[] }) => setRequests(body.proposals ?? []))
      .catch(() => undefined);
  }, []);

  async function decide(request: Request, decision: "approved" | "declined") {
    setBusy(request.id);
    const response = await fetch("/api/mentor/due-date-proposals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: request.id, decision }),
    }).catch(() => null);
    setBusy(null);
    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof data?.error === "string" ? data.error : "Could not save that decision.");
      return;
    }
    setRequests((current) => current.filter((item) => item.id !== request.id));
    toast.success(decision === "approved" ? `Moved to ${shortDate(request.proposedDue)}.` : "Declined. The date stays.");
    router.refresh();
  }

  if (requests.length === 0) return null;
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5">
      <h2 className="text-lg font-extrabold text-ink">Mentor requests</h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {requests.map((request) => (
          <li className="flex flex-wrap items-start justify-between gap-3 border-b border-divider pb-3 last:border-b-0 last:pb-0" key={request.id}>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-bold text-ink">
                {request.menteeName}: {request.stepTitle}
              </p>
              <p className="text-sm text-ink-2">
                {request.proposedByName} asks to move it from {shortDate(request.currentDue)} to{" "}
                <span className="font-bold text-ink">{shortDate(request.proposedDue)}</span>.
              </p>
              <p className="text-sm text-muted">{request.reason}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button className="btn-secondary" disabled={busy === request.id} onClick={() => void decide(request, "declined")} type="button">
                Decline
              </button>
              <button className="btn-primary" disabled={busy === request.id} onClick={() => void decide(request, "approved")} type="button">
                Approve new date
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
