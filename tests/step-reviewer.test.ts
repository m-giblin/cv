import { describe, expect, it } from "vitest";
import { stepReviewer } from "@/lib/plans/step-reviewer";

const mentor = "mentor";
const manager = "manager";

describe("stepReviewer", () => {
  it("sends everyday steps to the mentor when there is one", () => {
    expect(stepReviewer({ type: "content_review", isSegmentGate: false }, mentor, manager)).toBe(mentor);
  });
  it("keeps check-ins with the mentor", () => {
    expect(stepReviewer({ type: "mentor_review", isSegmentGate: false }, mentor, manager)).toBe(mentor);
  });
  it("leaves every stage gate, test-outs included, with the manager", () => {
    expect(stepReviewer({ type: "mentor_review", isSegmentGate: true }, mentor, manager)).toBe(manager);
    expect(stepReviewer({ type: "custom", isSegmentGate: true }, mentor, manager)).toBe(manager);
  });
  it("falls back to the manager without a mentor", () => {
    expect(stepReviewer({ type: "content_review", isSegmentGate: false }, undefined, manager)).toBe(manager);
  });
});
