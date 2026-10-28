import { describe, expect, it } from "vitest";
import { buildMentorStepReviews, type StepReviewEventRow } from "@/lib/mentoring/mentor-step-reviews";
import { feedbackItemCount } from "@/lib/se/readiness-tabs";
import type { DashboardData, PlanStep, UserPlan } from "@/lib/types";

function step(assignmentStepId: string, status: PlanStep["status"], extra: Partial<PlanStep> = {}): PlanStep {
  return {
    id: `ps-${assignmentStepId}`,
    assignmentStepId,
    title: `Step ${assignmentStepId}`,
    description: "",
    type: "content_review",
    order: 1,
    status,
    ...extra,
  };
}

function plan(steps: PlanStep[], mentorId: string | null = "mentor"): UserPlan {
  return {
    id: "plan",
    planTemplateId: "tpl",
    userId: "se",
    mentorId,
    name: "Onboarding",
    startDate: "2026-10-01",
    targetCompletion: "2027-01-30",
    status: "in_progress",
    progress: 10,
    steps,
  };
}

function event(id: string, type: string, at: string, metadata: Record<string, unknown>, actor: string | null = "mentor"): StepReviewEventRow {
  return { id, actor_id: actor, event_type: type, metadata, created_at: at };
}

const names = new Map([["mentor", "Alex Rivera"]]);

describe("buildMentorStepReviews", () => {
  it("lists submitted steps as waiting on the mentor, leaving stage gates to the manager", () => {
    const result = buildMentorStepReviews({
      plans: [plan([step("a", "submitted"), step("gate", "submitted", { isSegmentGate: true })])],
      userId: "se",
      events: [event("s1", "plan_step_completed", "2026-10-20T10:00:00Z", { assignment_step_id: "a" }, "se")],
      mentorNames: names,
    });
    expect(result.mentorFirstName).toBe("Alex");
    expect(result.items).toEqual([
      expect.objectContaining({ assignmentStepId: "a", status: "awaiting", date: "2026-10-20T10:00:00Z", reviewerName: "Alex Rivera" }),
    ]);
  });

  it("shows an approval with its note once, and an outstanding send-back", () => {
    const result = buildMentorStepReviews({
      plans: [plan([step("a", "reviewed"), step("b", "in_progress")])],
      userId: "se",
      events: [
        event("d1", "manager_feedback_received", "2026-10-21T10:00:00Z", { assignment_step_id: "a", validation_status: "reviewed", feedback: "Nice work" }),
        event("n1", "mentor_step_feedback", "2026-10-21T10:00:01Z", { assignment_step_id: "a", body: "Nice work" }),
        event("d2", "manager_feedback_received", "2026-10-22T10:00:00Z", { assignment_step_id: "b", validation_status: "rejected", feedback: "Add the ROI slide" }),
      ],
      mentorNames: names,
    });
    expect(result.items.map((item) => [item.id, item.status, item.feedback])).toEqual([
      ["d2", "sent_back", "Add the ROI slide"],
      ["d1", "approved", "Nice work"],
    ]);
  });

  it("treats a send-back as resolved once the step is resubmitted, and ignores other reviewers", () => {
    const result = buildMentorStepReviews({
      plans: [plan([step("b", "submitted")])],
      userId: "se",
      events: [
        event("d2", "manager_feedback_received", "2026-10-22T10:00:00Z", { assignment_step_id: "b", validation_status: "rejected", feedback: "Redo" }),
        event("s2", "plan_step_completed", "2026-10-23T10:00:00Z", { assignment_step_id: "b" }, "se"),
        event("m1", "manager_feedback_received", "2026-10-19T10:00:00Z", { assignment_step_id: "b", validation_status: "rejected", feedback: "x" }, "manager"),
      ],
      mentorNames: names,
    });
    expect(result.items.map((item) => [item.id, item.status])).toEqual([
      ["b", "awaiting"],
      ["d2", "sent_back_resolved"],
    ]);
  });

  it("returns nothing for a plan without a mentor", () => {
    const result = buildMentorStepReviews({ plans: [plan([step("a", "submitted")], null)], userId: "se", events: [], mentorNames: names });
    expect(result.items).toEqual([]);
  });
});

describe("feedbackItemCount", () => {
  it("counts ramp steps waiting on the mentor from the plan", () => {
    const data = {
      currentUser: { id: "se" },
      submissions: [],
      coachingCards: [],
      plans: [plan([step("a", "submitted"), step("b", "in_progress")])],
    } as unknown as Pick<DashboardData, "currentUser" | "submissions" | "coachingCards" | "plans">;
    expect(feedbackItemCount(data)).toBe(1);
    expect(feedbackItemCount(data, 3)).toBe(3);
  });
});
