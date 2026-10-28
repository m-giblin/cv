import { describe, expect, it } from "vitest";
import { stepsToTestOut } from "@/lib/plans/test-out";

const step = (plan_step_id: string, status: string) => ({ id: `a-${plan_step_id}`, plan_step_id, status, notes: null });

describe("stepsToTestOut", () => {
  const gates = ["g1", "g2"];
  const steps = [step("s1", "reviewed"), step("s2", "not_started"), step("s3", "submitted"), step("g1", "reviewed"), step("g2", "submitted")];

  it("closes the stage's open steps when the last gate is approved", () => {
    expect(stepsToTestOut(gates, steps, "g2").map((row) => row.plan_step_id)).toEqual(["s2", "s3"]);
  });

  it("does nothing while a gate is still open", () => {
    expect(stepsToTestOut(gates, steps, "s3")).toEqual([]);
  });

  it("does nothing for a plan without gates", () => {
    expect(stepsToTestOut([], steps, "s2")).toEqual([]);
  });
});
