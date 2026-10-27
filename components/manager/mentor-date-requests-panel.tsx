"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDueDate, type DateProposal, type ScheduleChange } from "@/lib/mentoring/mentor-records-model";

type Request = DateProposal & { menteeName: string };
type Change = ScheduleChange & { menteeName: string };

/**
 * Mentors agree due dates with the new hire and set them; the manager is told, not asked. Requests
 * made before that rule (when mentors had to ask) can still be decided here until they are cleared.
 */
export function MentorDateRequestsPanel() {
  const router = useRouter();
  const [changes, setChanges] = useState<Change[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/mentor/schedule")
      .then((response) => (response.ok ? response.json() : { changes: [] }))
      .then((body: { changes?: Change[] }) => setChanges(body.changes ?? []))
      .catch(() => undefined);
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
    toast.success(decision === "approved" ? `Moved to ${formatDueDate(request.proposedDue)}.` : "Declined. The date stays.");
    router.refresh();
  }

  if (changes.length === 0 && requests.length === 0) return null;
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5">
      <h2 className="text-lg font-extrabold text-ink">Schedule changes by mentors</h2>
      <p className="text-sm text-muted">Mentors agree due dates with the new hire and set them. These are for your information.</p>
      {changes.length ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {changes.slice(0, 8).map((change) => (
            <li className="flex flex-col gap-1 border-b border-divider pb-3 last:border-b-0 last:pb-0" key={change.id}>
              <p className="font-bold text-ink">
                {change.menteeName}: {change.scope === "step" ? change.changes[0]?.stepTitle : change.planName}
              </p>
              <p className="text-sm text-ink-2">
                {change.setByName} set {change.changes.length} date{change.changes.length === 1 ? "" : "s"} on{" "}
                {formatDueDate(change.createdAt.slice(0, 10))}
                {change.scope === "step" && change.changes[0]
                  ? `: ${formatDueDate(change.changes[0].from)} to ${formatDueDate(change.changes[0].to)}`
                  : change.lastDue
                    ? `. The stage now ends ${formatDueDate(change.lastDue)}`
                    : ""}
                .
              </p>
              {change.note ? <p className="text-sm text-muted">{change.note}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {requests.length ? (
        <>
          <h3 className="text-base font-extrabold text-ink">Older requests waiting on you</h3>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {requests.map((request) => (
              <li className="flex flex-wrap items-start justify-between gap-3 border-b border-divider pb-3 last:border-b-0 last:pb-0" key={request.id}>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-bold text-ink">
                    {request.menteeName}: {request.stepTitle}
                  </p>
                  <p className="text-sm text-ink-2">
                    {request.proposedByName} asked to move it from {formatDueDate(request.currentDue)} to{" "}
                    <span className="font-bold text-ink">{formatDueDate(request.proposedDue)}</span>.
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
        </>
      ) : null}
    </section>
  );
}
