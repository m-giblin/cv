import { describe, expect, it } from "vitest";
import { computeAssignmentProgress, daysBetween, dueLabel, parseDrillTotal } from "@/lib/playbooks/assignment-model";

const base = {
  requireRead: true,
  requirePitch: true,
  requireObjections: true,
  pitchPassScore: 70,
  dueDate: "2026-10-20",
  status: "active" as const,
};
const none = { readAt: null, pitchScores: [], objectionScores: [] };

describe("playbook assignment progress", () => {
  it("is not started, then in progress, then done as parts are completed", () => {
    expect(computeAssignmentProgress(base, none, "2026-10-10").state).toBe("not_started");
    expect(computeAssignmentProgress(base, { ...none, readAt: "2026-10-09" }, "2026-10-10").state).toBe("in_progress");
    const done = computeAssignmentProgress(base, { readAt: "x", pitchScores: [55, 74], objectionScores: [null] }, "2026-10-10");
    expect(done.state).toBe("done");
    expect(done.parts.map((part) => [part.key, part.done, part.detail])).toEqual([
      ["read", true, "Read"],
      ["pitch", true, "Best 74"],
      ["objections", true, "Completed"],
    ]);
  });

  it("needs the pass mark on the pitch, not just an attempt", () => {
    const progress = computeAssignmentProgress(base, { readAt: "x", pitchScores: [65], objectionScores: [80] }, "2026-10-10");
    expect(progress.parts.find((part) => part.key === "pitch")).toMatchObject({ done: false, detail: "Best 65" });
    expect(progress.state).toBe("in_progress");
  });

  it("goes overdue after the due date unless everything is done", () => {
    expect(computeAssignmentProgress(base, none, "2026-10-21")).toMatchObject({ state: "overdue", daysLeft: -1 });
    const finished = computeAssignmentProgress(base, { readAt: "x", pitchScores: [90], objectionScores: [70] }, "2026-10-25");
    expect(finished.state).toBe("done");
  });

  it("only counts the parts that were required", () => {
    const readOnly = { ...base, requirePitch: false, requireObjections: false };
    const progress = computeAssignmentProgress(readOnly, { ...none, readAt: "x" }, "2026-10-10");
    expect(progress.parts).toHaveLength(1);
    expect(progress.state).toBe("done");
  });

  it("labels due dates in plain words", () => {
    const at = (today: string) => dueLabel(computeAssignmentProgress(base, none, today), base.dueDate);
    expect(at("2026-10-20")).toBe("Due today");
    expect(at("2026-10-19")).toBe("Due tomorrow");
    expect(at("2026-10-01")).toBe("Due Oct 20");
    expect(at("2026-10-22")).toBe("Overdue · was due Oct 20");
    expect(daysBetween("2026-12-31", "2027-01-02")).toBe(2);
  });

  it("reads the objection drill total from the debrief", () => {
    expect(parseDrillTotal("Strongest answer…\nTOTAL: 42 / 60")).toBe(70);
    expect(parseDrillTotal("TOTAL:58/60 (Elite)")).toBe(97);
    expect(parseDrillTotal("no total here")).toBeNull();
  });
});
