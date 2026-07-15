import { describe, expect, it } from "vitest";
import { computeSeReadinessScore } from "@/lib/readiness/compute-score";
import type { UserPlan } from "@/lib/types";

describe("computeSeReadinessScore", () => {
  it("scores field-ready SEs highly", () => {
    const plan: UserPlan = {
      id: "a1",
      planTemplateId: "tpl-1",
      userId: "u1",
      mentorId: null,
      name: "Ramp",
      startDate: "2026-01-01",
      targetCompletion: "2026-05-01",
      status: "in_progress",
      progress: 85,
      unlockedSegmentMax: 3,
      steps: [],
    };

    const result = computeSeReadinessScore({
      plan,
      coachingCards: [
        {
          id: "c1",
          simulationAssignmentId: "s1",
          userId: "u1",
          strengths: [],
          gaps: [],
          recommendedImprovements: [],
          score: 88,
          linkedCompetencies: [],
          managerSummary: "",
          seReflection: null,
          managerReviewStatus: "reviewed",
          isPractice: false,
          managerComments: null,
          managerGrade: 5,
          sentToManagerAt: "",
          reviewedAt: null,
        },
      ],
      approvedCertCount: 6,
      labSessions30d: 4,
      pitchApproved: true,
    });

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.label).toBe("Field ready");
  });
});
