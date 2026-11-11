import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/tenant-scoped-query", () => ({ getTenantAdminClient: () => null }));

import { pickNextUpStep } from "@/lib/plans/next-up";
import type { PlanStep, UserPlan } from "@/lib/types";

const step = (id: string, order: number, type: PlanStep["type"], status: PlanStep["status"] = "not_started", extra: Partial<PlanStep> = {}): PlanStep =>
  ({ id, assignmentStepId: `a-${id}`, title: id, description: "", type, order, status, ...extra }) as PlanStep;

const plan = (id: string, steps: PlanStep[]): UserPlan =>
  ({ id, planTemplateId: id, userId: "u", name: id, startDate: "2026-11-04", targetCompletion: "", status: "in_progress", progress: 0, steps }) as UserPlan;

describe("pickNextUpStep", () => {
  it("offers the chapter's quiz after the chapter is read", () => {
    const month1 = plan("mth1", [
      step("ch1", 1, "playbook", "completed", { playbookSlug: "atlas" }),
      step("ch1-quiz", 2, "knowledge_check", "not_started", { questionSource: "playbook:1", passScore: 90 }),
      step("ch2", 3, "playbook"),
    ]);
    expect(pickNextUpStep([month1], ["ch1"])).toMatchObject({ title: "ch1-quiz", label: "Take the quiz", questionSource: "playbook:1", passScore: 90 });
  });

  it("offers the next chapter after the quiz, skipping done and locked steps", () => {
    const month1 = plan("mth1", [
      step("ch1", 1, "playbook", "completed"),
      step("ch1-quiz", 2, "knowledge_check", "completed"),
      step("locked", 3, "simulation", "not_started", { locked: true }),
      step("ch2", 4, "playbook", "not_started", { playbookSlug: "harbor-pilot" }),
    ]);
    expect(pickNextUpStep([month1], ["ch1-quiz"])).toMatchObject({ title: "ch2", label: "Read it now", href: "/learn/playbooks?playbook=harbor-pilot" });
  });

  it("offers the step after the one just done, not an earlier one left open", () => {
    const month1 = plan("mth1", [
      step("vocab", 1, "content_review"),
      step("lifecycle", 2, "playbook", "completed"),
      step("lifecycle-quiz", 3, "knowledge_check", "not_started", { questionSource: "playbook:2" }),
    ]);
    expect(pickNextUpStep([month1], ["lifecycle"])?.title).toBe("lifecycle-quiz");
    expect(pickNextUpStep([month1], ["lifecycle-quiz"])?.title).toBe("vocab");
  });

  it("stays on the plan that held the finished step", () => {
    const month1 = plan("mth1", [step("ch5", 1, "playbook")]);
    const month3 = plan("mth3", [step("ch17", 1, "playbook", "completed"), step("ch17-quiz", 2, "knowledge_check")]);
    expect(pickNextUpStep([month1, month3], ["ch17"])?.title).toBe("ch17-quiz");
  });

  it("offers nothing when the step wasn't on a plan or the plan is done", () => {
    expect(pickNextUpStep([plan("mth1", [step("ch1", 1, "playbook")])], ["other"])).toBeNull();
    expect(pickNextUpStep([plan("mth1", [step("ch1", 1, "playbook", "completed")])], ["ch1"])).toBeNull();
  });
});
