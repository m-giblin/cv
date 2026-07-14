import { describe, expect, it } from "vitest";
import { buildProgramTrackerModel } from "@/lib/plans/program-tracker-data";
import type { Profile, UserPlan } from "@/lib/types";

const person: Profile = {
  id: "user-1",
  email: "se@example.com",
  fullName: "Jordan Lee",
  role: "basic_se",
  level: "Basic",
  managerId: "mgr-1",
  tenantId: "tenant-1",
  createdAt: "2026-01-01T00:00:00Z",
};

const plan: UserPlan = {
  id: "assign-1",
  userId: "user-1",
  mentorId: null,
  name: "Week 1–2 — Boots on the ground",
  startDate: "2026-01-05",
  targetCompletion: "2026-04-05",
  status: "in_progress",
  progress: 42,
  unlockedSegmentMax: 2,
  steps: [
    {
      id: "s1",
      assignmentStepId: "as1",
      title: "Platform orientation",
      description: "",
      type: "content_review",
      order: 1,
      status: "reviewed",
      dueDate: "2026-01-10",
      segmentIndex: 1,
    },
    {
      id: "s2",
      assignmentStepId: "as2",
      title: "Discovery sim",
      description: "",
      type: "simulation",
      order: 2,
      status: "in_progress",
      dueDate: "2026-01-20",
      segmentIndex: 2,
      isSegmentGate: true,
    },
  ],
};

describe("program tracker model", () => {
  it("builds cohort stats and matrix rows", () => {
    const model = buildProgramTrackerModel({
      org: [person],
      plans: [plan],
      coachingByUser: {
        "user-1": {
          health: "at_risk",
          healthLabel: "At risk",
          storyLine: "",
          currentFocus: null,
          lastActiveLabel: "Today",
          lastActiveDays: 0,
          onboardingProgress: 42,
          onboardingLabel: "42%",
          devGoalsOnTrack: 0,
          devGoalsTotal: 0,
          devGoalsLabel: "",
          avgSimScore: 60,
          latestSimScore: 60,
          simTrendLabel: "",
          redoCount: 0,
          openReviewCount: 0,
          careerReadiness: null,
          topGaps: [],
          talkingPoints: [],
          quarterlyChip: null,
          quarterlyLabel: null,
          certPendingChip: null,
          cohortShortLabel: null,
          certsLabel: "",
        },
      },
      approvedCertCountByUser: { "user-1": 2 },
    });

    expect(model.cohortSize).toBe(1);
    expect(model.matrixRows).toHaveLength(1);
    expect(model.matrixRows[0]?.phases).toHaveLength(4);
    expect(model.blocked).toBeGreaterThanOrEqual(1);
    expect(model.milestones.length).toBeGreaterThanOrEqual(0);
  });
});
