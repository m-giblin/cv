import { describe, expect, it } from "vitest";
import { canMentorApproveStep } from "@/lib/plans/review-policy";

const base = { reviewerId: "m1", mentorId: "m1" };

describe("canMentorApproveStep", () => {
  it("lets the assigned mentor approve everyday steps", () => {
    expect(canMentorApproveStep({ ...base, stepType: "content_review" })).toBe(true);
    expect(canMentorApproveStep({ ...base, stepType: "challenge" })).toBe(true);
  });
  it("keeps stage gates with the hiring manager", () => {
    expect(canMentorApproveStep({ ...base, stepType: "content_review", isSegmentGate: true })).toBe(false);
    expect(canMentorApproveStep({ ...base, stepType: "mentor_review", isSegmentGate: true })).toBe(false);
  });
  it("leaves check-ins on the endorse flow", () => {
    expect(canMentorApproveStep({ ...base, stepType: "mentor_review" })).toBe(false);
  });
  it("refuses anyone who isn't the assigned mentor", () => {
    expect(canMentorApproveStep({ reviewerId: "x", mentorId: "m1", stepType: "content_review" })).toBe(false);
    expect(canMentorApproveStep({ reviewerId: "x", mentorId: null, stepType: "content_review" })).toBe(false);
  });
});
