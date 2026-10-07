/**
 * Playbook assignments: a manager or admin asks someone to work through a playbook by a date.
 * Progress comes from what the person actually did (read it, scored the pitch drill, finished
 * the objection drill), so practice done before the assignment counts too. Pure logic only, so
 * the browser can use it; loading lives in lib/playbooks/assignments.ts.
 */

export type AssignmentStatus = "active" | "completed" | "cancelled";
export type AssignmentState = "done" | "overdue" | "in_progress" | "not_started";

export const ASSIGNMENT_STATE_LABELS: Record<AssignmentState, string> = {
  done: "Done",
  overdue: "Overdue",
  in_progress: "In progress",
  not_started: "Not started",
};

export type PlaybookAssignment = {
  id: string;
  playbookId: string;
  playbookTitle: string;
  playbookSlug: string;
  chapter: number;
  assignedTo: string;
  assigneeName: string;
  assignedBy: string | null;
  assignedByName: string | null;
  dueDate: string;
  requireRead: boolean;
  requirePitch: boolean;
  requireObjections: boolean;
  pitchPassScore: number;
  note: string | null;
  status: AssignmentStatus;
  completedAt: string | null;
  createdAt: string;
  progress: AssignmentProgress;
};

export type AssignmentSignals = {
  readAt: string | null;
  /** Average rubric score of each scored pitch-drill attempt. */
  pitchScores: number[];
  /** Completed objection drills (score out of 100, when the debrief gave one). */
  objectionScores: (number | null)[];
};

export type AssignmentPart = { key: "read" | "pitch" | "objections"; label: string; done: boolean; detail: string };

export type AssignmentProgress = {
  parts: AssignmentPart[];
  state: AssignmentState;
  /** Whole days until the due date; negative once overdue. */
  daysLeft: number;
};

/** Calendar-day difference between two YYYY-MM-DD dates (or a date and today). */
export function daysBetween(from: string, to: string) {
  const start = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const end = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((end - start) / 86_400_000);
}

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function computeAssignmentProgress(
  assignment: Pick<PlaybookAssignment, "requireRead" | "requirePitch" | "requireObjections" | "pitchPassScore" | "dueDate" | "status">,
  signals: AssignmentSignals,
  today = todayIso(),
): AssignmentProgress {
  const bestPitch = signals.pitchScores.length ? Math.max(...signals.pitchScores) : null;
  const objectionRuns = signals.objectionScores.length;
  const bestObjections = signals.objectionScores.reduce<number | null>(
    (best, score) => (score === null ? best : Math.max(best ?? 0, score)),
    null,
  );

  const parts: AssignmentPart[] = [];
  if (assignment.requireRead) {
    parts.push({ key: "read", label: "Read the playbook", done: Boolean(signals.readAt), detail: signals.readAt ? "Read" : "Not yet" });
  }
  if (assignment.requirePitch) {
    parts.push({
      key: "pitch",
      label: `Pitch drill, ${assignment.pitchPassScore}+`,
      done: bestPitch !== null && bestPitch >= assignment.pitchPassScore,
      detail: bestPitch === null ? "Not tried" : `Best ${bestPitch}`,
    });
  }
  if (assignment.requireObjections) {
    parts.push({
      key: "objections",
      label: "Objection drill",
      done: objectionRuns > 0,
      detail: objectionRuns === 0 ? "Not tried" : bestObjections === null ? "Completed" : `Completed, ${bestObjections}%`,
    });
  }

  const daysLeft = daysBetween(today, assignment.dueDate);
  const allDone = parts.every((part) => part.done);
  const anyProgress = signals.readAt !== null || signals.pitchScores.length > 0 || objectionRuns > 0;
  const state: AssignmentState =
    assignment.status === "completed" || allDone
      ? "done"
      : daysLeft < 0
        ? "overdue"
        : anyProgress
          ? "in_progress"
          : "not_started";
  return { parts, state, daysLeft };
}

export function dueLabel(progress: AssignmentProgress, dueDate: string) {
  if (progress.state === "done") return "Done";
  const date = new Date(`${dueDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (progress.daysLeft < 0) return `Overdue · was due ${date}`;
  if (progress.daysLeft === 0) return "Due today";
  if (progress.daysLeft === 1) return "Due tomorrow";
  return `Due ${date}`;
}

/** Turns "TOTAL: 42 / 60" in an objection-drill debrief into a percentage. */
export function parseDrillTotal(text: string): number | null {
  const match = /TOTAL:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+)/i.exec(text);
  if (!match) return null;
  const earned = Number(match[1]);
  const possible = Number(match[2]);
  if (!possible) return null;
  return Math.max(0, Math.min(100, Math.round((earned / possible) * 100)));
}
