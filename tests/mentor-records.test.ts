import { describe, expect, it } from "vitest";
import {
  EMPTY_RECORDS,
  MENTOR_EVENT,
  agendaForCheckin,
  buildCheckinAgenda,
  buildMenteeRecords,
  mentorAttention,
  type MentorEventRow,
} from "@/lib/mentoring/mentor-records-model";
import type { PlanStep } from "@/lib/types";

function row(id: string, event_type: string, metadata: Record<string, unknown>, created_at: string): MentorEventRow {
  return { id, user_id: "mentee", actor_id: "mentor", event_type, metadata, created_at };
}

function step(overrides: Partial<PlanStep>): PlanStep {
  return {
    id: overrides.id ?? "s",
    assignmentStepId: overrides.assignmentStepId ?? `a-${overrides.id ?? "s"}`,
    title: "Step",
    type: "content",
    status: "not_started",
    ...overrides,
  } as PlanStep;
}

describe("buildMenteeRecords", () => {
  it("folds a decision into its proposal and keeps the latest gate recommendation", () => {
    const records = buildMenteeRecords(
      [
        row("d1", MENTOR_EVENT.dateDecision, { proposal_id: "p1", decision: "approved" }, "2026-10-03T00:00:00Z"),
        row("p1", MENTOR_EVENT.dateProposal, { assignment_step_id: "a1", proposed_due: "2026-10-20", reason: "PTO week" }, "2026-10-01T00:00:00Z"),
        row("p2", MENTOR_EVENT.dateProposal, { assignment_step_id: "a2", proposed_due: "2026-10-21", reason: "Customer trip" }, "2026-10-02T00:00:00Z"),
        row("g1", MENTOR_EVENT.gateRecommendation, { assignment_step_id: "gate", recommendation: "not_yet" }, "2026-10-01T00:00:00Z"),
        row("g2", MENTOR_EVENT.gateRecommendation, { assignment_step_id: "gate", recommendation: "ready" }, "2026-10-04T00:00:00Z"),
        row("x", "something_else", {}, "2026-10-05T00:00:00Z"),
      ],
      () => "Matt",
    );
    expect(records.proposals.map((item) => [item.id, item.status])).toEqual([
      ["p2", "pending"],
      ["p1", "approved"],
    ]);
    expect(records.gateRecommendations).toHaveLength(1);
    expect(records.gateRecommendations[0]).toMatchObject({ id: "g2", recommendation: "ready", authorName: "Matt" });
  });

  it("keeps the latest hiring brief and marks an acknowledged manager note", () => {
    const records = buildMenteeRecords(
      [
        row("b1", MENTOR_EVENT.hiringBrief, { background: "First draft", watch_for: "Old gap" }, "2026-10-01T00:00:00Z"),
        row("b2", MENTOR_EVENT.hiringBrief, { background: "From a university IAM team", watch_for: "Jumps to the product" }, "2026-10-02T00:00:00Z"),
        row("n1", MENTOR_EVENT.managerNote, { assignment_id: "a", strength: "Clear", risk: "Rushes", action: "Pair Thursday" }, "2026-10-03T00:00:00Z"),
        row("n2", MENTOR_EVENT.managerNote, { assignment_id: "a", strength: "Curious", risk: "Quiet", action: "Ask first" }, "2026-10-04T00:00:00Z"),
        row("k1", MENTOR_EVENT.managerNoteAck, { note_id: "n1" }, "2026-10-05T00:00:00Z"),
      ],
      () => "Avery",
    );
    expect(records.hiringBrief).toMatchObject({ id: "b2", background: "From a university IAM team", authorName: "Avery" });
    expect(records.managerNotes.map((item) => [item.id, item.acknowledged])).toEqual([
      ["n2", false],
      ["n1", true],
    ]);
  });
});

describe("buildCheckinAgenda", () => {
  it("lists overdue, submitted, upcoming gate, and last follow-up", () => {
    const steps = [
      step({ id: "late", title: "Late one", dueDate: "2026-10-01" }),
      step({ id: "sub", title: "Sent in", status: "submitted" }),
      step({ id: "gate", title: "Gate", dueDate: "2026-10-12", isSegmentGate: true }),
      step({ id: "done", title: "Done", dueDate: "2026-10-01", status: "reviewed" }),
    ];
    const records = {
      ...EMPTY_RECORDS,
      checkins: [{ id: "c", assignmentId: "a", metOn: "2026-10-03", agenda: [], notes: "", nextActions: "Rerun the sim", createdAt: "" }],
    };
    expect(buildCheckinAgenda(steps, records, "2026-10-10").map((item) => item.kind)).toEqual([
      "overdue",
      "submitted",
      "gate",
      "follow_up",
    ]);
  });
});

describe("agendaForCheckin", () => {
  it("uses the first-meeting script until a 1:1 is logged, and adds the interview gap", () => {
    const brief = {
      id: "b",
      background: "University IAM",
      watchFor: "Jumps to the product",
      authorName: "Avery",
      createdAt: "2026-10-01T00:00:00Z",
    };
    const first = agendaForCheckin([], { ...EMPTY_RECORDS, hiringBrief: brief }, "2026-10-10");
    expect(first.firstMeeting).toBe(true);
    expect(first.items.at(-1)?.text).toContain("Jumps to the product");
    const later = agendaForCheckin([], {
      ...EMPTY_RECORDS,
      checkins: [{ id: "c", assignmentId: "a", metOn: "2026-10-08", agenda: [], notes: "", nextActions: "", createdAt: "" }],
    }, "2026-10-10");
    expect(later.firstMeeting).toBe(false);
  });
});

describe("mentorAttention", () => {
  it("asks for a gate recommendation once the other steps are done", () => {
    const steps = [step({ id: "one", status: "reviewed" }), step({ id: "gate", isSegmentGate: true })];
    const checkins = [{ id: "c", assignmentId: "a", metOn: "2026-10-08", agenda: [], notes: "", nextActions: "", createdAt: "" }];
    expect(mentorAttention(steps, { ...EMPTY_RECORDS, checkins }, "2026-10-10").map((item) => item.text)).toEqual([
      "Ready for the gate: add your recommendation",
    ]);
  });

  it("flags a missing 1:1", () => {
    expect(mentorAttention([], EMPTY_RECORDS, "2026-10-10").map((item) => item.text)).toEqual(["No 1:1 logged yet"]);
  });
});
