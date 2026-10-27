import type { PlanStep } from "@/lib/types";

/**
 * Mentor records are append-only activity events on the mentee (`activity_logs.user_id` is the mentee,
 * `actor_id` is the mentor or manager). A due-date decision is its own event that points at the proposal.
 */
export const MENTOR_EVENT = {
  feedback: "mentor_step_feedback",
  checkin: "mentor_checkin",
  dateProposal: "mentor_due_date_proposal",
  dateDecision: "mentor_due_date_decision",
  gateRecommendation: "mentor_gate_recommendation",
  overdueAlert: "mentor_overdue_alert",
  hiringBrief: "mentor_hiring_brief",
  managerNote: "mentor_manager_note",
  managerNoteAck: "mentor_manager_note_ack",
} as const;

export type MentorEventType = (typeof MENTOR_EVENT)[keyof typeof MENTOR_EVENT];

export const MENTOR_EVENT_TYPES: MentorEventType[] = Object.values(MENTOR_EVENT);

export type MentorEventRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  event_type: string;
  metadata: unknown;
  created_at: string;
};

export type StepFeedback = {
  id: string;
  assignmentStepId: string;
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
};

export type MentorCheckin = {
  id: string;
  assignmentId: string;
  metOn: string;
  agenda: string[];
  notes: string;
  nextActions: string;
  createdAt: string;
};

export type DateProposalStatus = "pending" | "approved" | "declined";

export type DateProposal = {
  id: string;
  menteeId: string;
  assignmentId: string;
  assignmentStepId: string;
  stepTitle: string;
  currentDue: string | null;
  proposedDue: string;
  reason: string;
  proposedById: string | null;
  proposedByName: string;
  createdAt: string;
  status: DateProposalStatus;
  decidedByName?: string;
  decidedAt?: string;
};

export type GateRecommendationValue = "ready" | "not_yet";

export type GateRecommendation = {
  id: string;
  assignmentStepId: string;
  recommendation: GateRecommendationValue;
  rationale: string;
  authorName: string;
  createdAt: string;
};

/** What the hiring manager wants the mentor to know before they meet the new hire. Latest write wins. */
export type HiringBrief = {
  id: string;
  background: string;
  watchFor: string;
  authorName: string;
  createdAt: string;
};

/** A short picture the mentor sends the manager: a strength, a risk, and what they are doing about it. */
export type ManagerNote = {
  id: string;
  assignmentId: string;
  strength: string;
  risk: string;
  action: string;
  authorId: string | null;
  authorName: string;
  createdAt: string;
  acknowledged: boolean;
};

export type MenteeRecords = {
  feedback: StepFeedback[];
  checkins: MentorCheckin[];
  proposals: DateProposal[];
  /** Latest recommendation per gate step. */
  gateRecommendations: GateRecommendation[];
  /** Latest brief the manager wrote for this person. */
  hiringBrief: HiringBrief | null;
  managerNotes: ManagerNote[];
};

export const EMPTY_RECORDS: MenteeRecords = {
  feedback: [],
  checkins: [],
  proposals: [],
  gateRecommendations: [],
  hiringBrief: null,
  managerNotes: [],
};

function meta(row: MentorEventRow): Record<string, unknown> {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? (row.metadata as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isMentorEventType(value: string): value is MentorEventType {
  return (MENTOR_EVENT_TYPES as string[]).includes(value);
}

/** Fold one mentee's mentor events (any order) into the records the mentor and manager see. */
export function buildMenteeRecords(rows: MentorEventRow[], nameOf: (id: string | null) => string): MenteeRecords {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const feedback: StepFeedback[] = [];
  const checkins: MentorCheckin[] = [];
  const proposals = new Map<string, DateProposal>();
  const gates = new Map<string, GateRecommendation>();
  const managerNotes = new Map<string, ManagerNote>();
  let hiringBrief: HiringBrief | null = null;

  for (const row of sorted) {
    if (!isMentorEventType(row.event_type)) continue;
    const data = meta(row);
    switch (row.event_type) {
      case MENTOR_EVENT.feedback:
        feedback.push({
          id: row.id,
          assignmentStepId: text(data.assignment_step_id),
          authorId: row.actor_id,
          authorName: nameOf(row.actor_id),
          body: text(data.body),
          createdAt: row.created_at,
        });
        break;
      case MENTOR_EVENT.checkin:
        checkins.push({
          id: row.id,
          assignmentId: text(data.assignment_id),
          metOn: text(data.met_on) || row.created_at.slice(0, 10),
          agenda: Array.isArray(data.agenda) ? data.agenda.filter((item): item is string => typeof item === "string") : [],
          notes: text(data.notes),
          nextActions: text(data.next_actions),
          createdAt: row.created_at,
        });
        break;
      case MENTOR_EVENT.dateProposal:
        proposals.set(row.id, {
          id: row.id,
          menteeId: row.user_id,
          assignmentId: text(data.assignment_id),
          assignmentStepId: text(data.assignment_step_id),
          stepTitle: text(data.step_title),
          currentDue: text(data.current_due) || null,
          proposedDue: text(data.proposed_due),
          reason: text(data.reason),
          proposedById: row.actor_id,
          proposedByName: nameOf(row.actor_id),
          createdAt: row.created_at,
          status: "pending",
        });
        break;
      case MENTOR_EVENT.dateDecision: {
        const proposal = proposals.get(text(data.proposal_id));
        if (!proposal || proposal.status !== "pending") break;
        proposal.status = data.decision === "approved" ? "approved" : "declined";
        proposal.decidedByName = nameOf(row.actor_id);
        proposal.decidedAt = row.created_at;
        break;
      }
      case MENTOR_EVENT.gateRecommendation:
        gates.set(text(data.assignment_step_id), {
          id: row.id,
          assignmentStepId: text(data.assignment_step_id),
          recommendation: data.recommendation === "ready" ? "ready" : "not_yet",
          rationale: text(data.rationale),
          authorName: nameOf(row.actor_id),
          createdAt: row.created_at,
        });
        break;
      case MENTOR_EVENT.overdueAlert:
        break;
      case MENTOR_EVENT.hiringBrief:
        hiringBrief = {
          id: row.id,
          background: text(data.background),
          watchFor: text(data.watch_for),
          authorName: nameOf(row.actor_id),
          createdAt: row.created_at,
        };
        break;
      case MENTOR_EVENT.managerNote:
        managerNotes.set(row.id, {
          id: row.id,
          assignmentId: text(data.assignment_id),
          strength: text(data.strength),
          risk: text(data.risk),
          action: text(data.action),
          authorId: row.actor_id,
          authorName: nameOf(row.actor_id),
          createdAt: row.created_at,
          acknowledged: false,
        });
        break;
      case MENTOR_EVENT.managerNoteAck: {
        const note = managerNotes.get(text(data.note_id));
        if (note) note.acknowledged = true;
        break;
      }
      default: {
        const exhaustive: never = row.event_type;
        return exhaustive;
      }
    }
  }

  return {
    feedback: feedback.reverse(),
    checkins: checkins.reverse(),
    proposals: [...proposals.values()].reverse(),
    gateRecommendations: [...gates.values()],
    hiringBrief,
    managerNotes: [...managerNotes.values()].reverse(),
  };
}

export type AgendaItem = {
  kind: "kickoff" | "overdue" | "submitted" | "due_soon" | "gate" | "follow_up";
  text: string;
};

/** The first logged 1:1 sets the relationship. Later 1:1s use the status agenda. */
export function firstMeetingAgenda(brief: HiringBrief | null): AgendaItem[] {
  const items: AgendaItem[] = [
    {
      kind: "kickoff",
      text: "How you will work: a weekly 30 minutes, and they should ask for help before they are stuck.",
    },
    {
      kind: "kickoff",
      text: "The 120 days: four stages, a manager gate at the end of each, and approval opens the next stage.",
    },
    {
      kind: "kickoff",
      text: "What good looks like by day 30: they can explain identity security to a new customer without naming a product.",
    },
    { kind: "kickoff", text: "What they already know, and what they want from you as a mentor." },
  ];
  const watch = brief?.watchFor.trim();
  if (watch) items.push({ kind: "kickoff", text: `What the interview left open: ${watch}` });
  return items;
}

/** First meeting until a 1:1 has been logged for this person, then the status agenda. */
export function agendaForCheckin(
  steps: PlanStep[],
  records: MenteeRecords,
  today: string,
): { firstMeeting: boolean; items: AgendaItem[] } {
  if (records.checkins.length === 0) return { firstMeeting: true, items: firstMeetingAgenda(records.hiringBrief) };
  return { firstMeeting: false, items: buildCheckinAgenda(steps, records, today) };
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** A 1:1 agenda built from where the mentee is: what's late, waiting, coming up, and last time's follow-ups. */
export function buildCheckinAgenda(steps: PlanStep[], records: MenteeRecords, today: string): AgendaItem[] {
  const open = steps.filter((step) => step.status !== "reviewed" && step.status !== "completed" && !step.locked);
  const weekOut = addDays(today, 7);
  const items: AgendaItem[] = [];
  for (const step of open) {
    if (step.dueDate && step.dueDate < today) items.push({ kind: "overdue", text: `Overdue: ${step.title}` });
  }
  for (const step of open) {
    if (step.status === "submitted" || step.status === "under_review") {
      items.push({ kind: "submitted", text: `Debrief the submitted work: ${step.title}` });
    }
  }
  for (const step of open) {
    if (step.dueDate && step.dueDate >= today && step.dueDate <= weekOut && step.status === "not_started") {
      items.push({
        kind: step.isSegmentGate ? "gate" : "due_soon",
        text: step.isSegmentGate ? `Prepare for the gate: ${step.title}` : `Coming up this week: ${step.title}`,
      });
    }
  }
  const last = records.checkins[0];
  if (last?.nextActions.trim()) items.push({ kind: "follow_up", text: `Follow up from ${last.metOn}: ${last.nextActions.trim()}` });
  return items;
}

/** Things a mentor should act on now, newest concerns first. */
export type AttentionItem = { tone: "danger" | "warning" | "blue"; text: string };

export function mentorAttention(steps: PlanStep[], records: MenteeRecords, today: string): AttentionItem[] {
  const items: AttentionItem[] = [];
  const overdue = steps.filter(
    (step) => step.dueDate && step.dueDate < today && step.status !== "reviewed" && step.status !== "completed",
  ).length;
  if (overdue > 0) items.push({ tone: "danger", text: `${overdue} step${overdue === 1 ? "" : "s"} overdue` });
  const submitted = steps.filter((step) => step.status === "submitted").length;
  if (submitted > 0) items.push({ tone: "warning", text: `${submitted} submitted, worth a look` });
  const gate = steps.find(
    (step) =>
      step.isSegmentGate &&
      step.status !== "reviewed" &&
      steps.filter((item) => !item.isSegmentGate).every((item) => item.status === "reviewed" || item.status === "completed"),
  );
  if (gate && !records.gateRecommendations.some((item) => item.assignmentStepId === gate.assignmentStepId)) {
    items.push({ tone: "blue", text: `Ready for the gate: add your recommendation` });
  }
  const lastCheckin = records.checkins[0]?.metOn;
  if (!lastCheckin || lastCheckin < addDays(today, -14)) {
    items.push({ tone: "warning", text: lastCheckin ? `No 1:1 logged since ${lastCheckin}` : "No 1:1 logged yet" });
  }
  return items;
}

/** What the mentee actually produced for a step: scores, submissions, transcripts. */
export type StepEvidence = {
  label: string;
  at?: string;
  facts: { label: string; value: string }[];
  lists: { label: string; items: string[] }[];
  texts: { label: string; body: string }[];
  transcript?: { speaker: string; message: string }[];
};
