import { describe, expect, it } from "vitest";
import { computeAssignmentProgress } from "@/lib/playbooks/assignment-model";

const base = { requireRead: true, requirePitch: false, requireObjections: false, pitchPassScore: 70, dueDate: "2026-12-01", status: "active" as const };
const read = { readAt: "2026-10-01", pitchScores: [], objectionScores: [] };

describe("chapter knowledge check part", () => {
  it("is left out when the chapter has no knowledge check", () => {
    const progress = computeAssignmentProgress(base, { ...read, quizScores: null }, "2026-10-07");
    expect(progress.parts.map((part) => part.key)).toEqual(["read"]);
    expect(progress.state).toBe("done");
  });
  it("must reach the pass mark before the chapter is done", () => {
    const below = computeAssignmentProgress({ ...base, quizPassScore: 80 }, { ...read, quizScores: [60, 75] }, "2026-10-07");
    expect(below.state).toBe("in_progress");
    const passed = computeAssignmentProgress({ ...base, quizPassScore: 80 }, { ...read, quizScores: [60, 90] }, "2026-10-07");
    expect(passed.state).toBe("done");
  });
  it("can be switched off by the manager", () => {
    const progress = computeAssignmentProgress({ ...base, requireQuiz: false }, { ...read, quizScores: [] }, "2026-10-07");
    expect(progress.state).toBe("done");
  });
});
