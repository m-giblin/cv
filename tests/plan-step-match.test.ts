import { describe, expect, it } from "vitest";
import { planStepMatchesReview } from "@/lib/plans/step-match";

describe("planStepMatchesReview", () => {
  const target = { stepType: "challenge", challengeId: "challenge-a" };

  it("matches the step linked to the reviewed challenge", () => {
    expect(planStepMatchesReview({ step_type: "challenge", challenge_id: "challenge-a" }, target)).toBe(true);
  });

  it("leaves another challenge's step alone", () => {
    expect(planStepMatchesReview({ step_type: "challenge", challenge_id: "challenge-b" }, target)).toBe(false);
  });

  it("leaves unlinked steps and other step types alone", () => {
    expect(planStepMatchesReview({ step_type: "challenge", challenge_id: null }, target)).toBe(false);
    expect(planStepMatchesReview({ step_type: "simulation", challenge_id: "challenge-a" }, target)).toBe(false);
    expect(planStepMatchesReview(null, target)).toBe(false);
  });

  it("still matches by type alone for reviews with no specific challenge", () => {
    expect(planStepMatchesReview({ step_type: "simulation" }, { stepType: "simulation" })).toBe(true);
  });
});
