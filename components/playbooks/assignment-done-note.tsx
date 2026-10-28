import { CheckCircle2 } from "lucide-react";

export type FinishedAssignment = { playbookTitle: string; assignedByName: string | null };

/** Shown where the last part of an assigned chapter was recorded: the assignment is done and the assigner told. */
export function AssignmentDoneNote({ finished, className = "" }: { finished: FinishedAssignment; className?: string }) {
  const who = finished.assignedByName ?? "your manager";
  const first = finished.assignedByName?.split(" ")[0] ?? "They";
  return (
    <p
      className={`m-0 flex items-start gap-2 rounded-[12px] border border-success/30 bg-success-soft px-4 py-3 text-sm text-ink ${className}`}
      role="status"
    >
      <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      <span>
        <strong>Assignment complete.</strong> That finishes {who}&apos;s assignment, {finished.playbookTitle}. {first} has been notified.
      </span>
    </p>
  );
}
