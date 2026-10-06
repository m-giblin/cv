import { describe, expect, it } from "vitest";
import {
  phaseOfStep,
  stepWeek,
  summarizeEnrollment,
  summarizePrograms,
  unenrolledPeople,
} from "@/lib/programs/program-model";
import type { DbTemplate } from "@/lib/admin/plan-builder";
import type { PlanStep, Profile, UserPlan } from "@/lib/types";

const NOW = new Date("2026-10-05T12:00:00Z");

function step(order: number, status: PlanStep["status"], extra: Partial<PlanStep> = {}): PlanStep {
  return { id: `s${order}`, title: `Step ${order}`, description: "", type: "custom", order, status, ...extra };
}

function plan(userId: string, steps: PlanStep[], extra: Partial<UserPlan> = {}): UserPlan {
  return {
    id: `a-${userId}`,
    planTemplateId: "t1",
    userId,
    mentorId: null,
    name: "SE ramp",
    startDate: "2026-09-07",
    targetCompletion: "2026-12-07",
    status: "in_progress",
    progress: 0,
    steps,
    ...extra,
  };
}

const person = (id: string): Profile => ({
  id,
  email: `${id}@example.com`,
  fullName: id,
  role: "basic_se",
  level: "Basic",
  managerId: null,
  tenantId: "t",
  createdAt: "2026-01-01",
});

describe("phaseOfStep", () => {
  it("uses the segment when set", () => {
    expect(phaseOfStep({ segmentIndex: 3 }, 0, 8)).toBe(3);
  });
  it("falls back to the step's quarter of the plan", () => {
    expect(phaseOfStep({ segmentIndex: null }, 0, 8)).toBe(1);
    expect(phaseOfStep({ segmentIndex: null }, 3, 8)).toBe(2);
    expect(phaseOfStep({ segmentIndex: null }, 7, 8)).toBe(4);
  });
});

describe("summarizeEnrollment", () => {
  it("marks finished phases complete, the first open phase active and the rest upcoming", () => {
    const summary = summarizeEnrollment(
      plan("a", [
        step(1, "completed", { segmentIndex: 1 }),
        step(2, "reviewed", { segmentIndex: 1 }),
        step(3, "in_progress", { segmentIndex: 2, dueDate: "2026-10-20" }),
        step(4, "not_started", { segmentIndex: 3, dueDate: "2026-11-01" }),
      ]),
      person("a"),
      NOW,
    );
    expect(summary.phases.map((phase) => phase.status)).toEqual(["complete", "active", "upcoming", "empty"]);
    expect(summary.progress).toBe(50);
    expect(summary.health).toBe("on_track");
    expect(summary.nextStep?.id).toBe("s3");
    expect(summary.week).toBe(5);
  });

  it("flags past-due unfinished work as overdue and the person at risk", () => {
    const summary = summarizeEnrollment(
      plan("b", [step(1, "in_progress", { segmentIndex: 1, dueDate: "2026-09-20" }), step(2, "not_started", { segmentIndex: 2 })]),
      person("b"),
      NOW,
    );
    expect(summary.overdue).toBe(1);
    expect(summary.phases[0]!.status).toBe("overdue");
    expect(summary.health).toBe("at_risk");
  });

  it("reports complete when every step is validated", () => {
    const summary = summarizeEnrollment(plan("c", [step(1, "completed"), step(2, "reviewed")]), null, NOW);
    expect(summary.health).toBe("complete");
    expect(summary.progress).toBe(100);
  });
});

describe("summarizePrograms", () => {
  const template: DbTemplate = {
    id: "t1",
    name: "SE ramp",
    description: "Core ramp",
    steps: [
      { id: "p1", sort_order: 1, metadata: { segmentIndex: 1 } },
      { id: "p2", sort_order: 2, metadata: { segmentIndex: 4 } },
    ] as unknown as DbTemplate["steps"],
  };

  it("groups enrollments under their program with averages and risk counts", () => {
    const programs = summarizePrograms(
      [template],
      [
        plan("a", [step(1, "completed"), step(2, "not_started")]),
        plan("b", [step(1, "in_progress", { dueDate: "2026-09-01" }), step(2, "not_started")]),
      ],
      [person("a"), person("b")],
      NOW,
    );
    expect(programs).toHaveLength(1);
    expect(programs[0]!.stepsPerPhase).toEqual([1, 0, 0, 1]);
    expect(programs[0]!.avgProgress).toBe(25);
    expect(programs[0]!.atRisk).toBe(1);
    expect(programs[0]!.enrollments[0]!.person?.id).toBe("b");
  });

  it("keeps enrollments whose program isn't in the template list", () => {
    const programs = summarizePrograms([], [plan("a", [step(1, "not_started")], { planTemplateId: "locked" })], [person("a")], NOW);
    expect(programs.map((program) => program.id)).toEqual(["locked"]);
  });
});

describe("helpers", () => {
  it("lists people with no active program", () => {
    const people = [person("a"), person("b"), person("c")];
    const plans = [plan("a", []), plan("b", [], { status: "completed" })];
    expect(unenrolledPeople(people, plans).map((item) => item.id)).toEqual(["b", "c"]);
  });

  it("places a dated step in its program week", () => {
    expect(stepWeek(step(1, "not_started", { dueDate: "2026-09-07" }), "2026-09-07")).toBe(1);
    expect(stepWeek(step(1, "not_started", { dueDate: "2026-09-21" }), "2026-09-07")).toBe(3);
    expect(stepWeek(step(1, "not_started"), "2026-09-07")).toBeNull();
  });
});
