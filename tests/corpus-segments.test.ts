import { describe, expect, it } from "vitest";
import { isStepLockedForSegment, parsePlanStepMetadata } from "@/lib/corpus/parse-step-metadata";
import { dispatchQaRouting } from "@/lib/corpus/routing-dispatch";
import { buildSegmentProgress } from "@/lib/plans/segment-progress";
import { shouldUnlockNextSegment } from "@/lib/plans/segment-gate-logic";
import type { UserPlan } from "@/lib/types";

describe("parsePlanStepMetadata", () => {
  it("parses segment and gate fields from metadata", () => {
    const meta = parsePlanStepMetadata(
      { segmentIndex: 2, isSegmentGate: true, dueOffsetDays: 45 },
      3,
    );
    expect(meta).toEqual({
      segmentIndex: 2,
      isSegmentGate: true,
      dueOffsetDays: 45,
    });
  });

  it("falls back due offset from sort order", () => {
    const meta = parsePlanStepMetadata({}, 4);
    expect(meta.dueOffsetDays).toBe(28);
    expect(meta.segmentIndex).toBeNull();
  });
});

describe("isStepLockedForSegment", () => {
  it("locks steps in future segments", () => {
    expect(isStepLockedForSegment(3, 2)).toBe(true);
    expect(isStepLockedForSegment(2, 2)).toBe(false);
    expect(isStepLockedForSegment(null, 1)).toBe(false);
  });
});

describe("shouldUnlockNextSegment", () => {
  it("unlocks when gate is approved and all segment steps are reviewed", () => {
    const unlock = shouldUnlockNextSegment({
      segmentIndex: 1,
      isSegmentGate: true,
      unlockedSegmentMax: 1,
      segmentStepStatuses: [
        { isGate: false, status: "reviewed" },
        { isGate: true, status: "reviewed" },
      ],
    });
    expect(unlock).toBe(true);
  });

  it("does not unlock when non-gate steps remain open", () => {
    const unlock = shouldUnlockNextSegment({
      segmentIndex: 1,
      isSegmentGate: true,
      unlockedSegmentMax: 1,
      segmentStepStatuses: [
        { isGate: false, status: "in_progress" },
        { isGate: true, status: "reviewed" },
      ],
    });
    expect(unlock).toBe(false);
  });

  it("ignores non-gate approvals", () => {
    const unlock = shouldUnlockNextSegment({
      segmentIndex: 1,
      isSegmentGate: false,
      unlockedSegmentMax: 1,
      segmentStepStatuses: [{ isGate: false, status: "reviewed" }],
    });
    expect(unlock).toBe(false);
  });
});

describe("buildSegmentProgress", () => {
  it("summarizes validated steps per segment", () => {
    const plan: UserPlan = {
      id: "a1",
      userId: "u1",
      mentorId: null,
      name: "120-day",
      startDate: "2026-01-01",
      targetCompletion: "2026-05-01",
      status: "in_progress",
      progress: 25,
      unlockedSegmentMax: 1,
      steps: [
        {
          id: "s1",
          title: "A",
          description: "",
          type: "content_review",
          order: 1,
          status: "reviewed",
          segmentIndex: 1,
          isSegmentGate: false,
        },
        {
          id: "s2",
          title: "Gate",
          description: "",
          type: "simulation",
          order: 2,
          status: "submitted",
          segmentIndex: 1,
          isSegmentGate: true,
        },
        {
          id: "s3",
          title: "B",
          description: "",
          type: "content_review",
          order: 3,
          status: "not_started",
          segmentIndex: 2,
          isSegmentGate: false,
          locked: true,
        },
      ],
    };

    const segments = buildSegmentProgress(plan);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      segmentIndex: 1,
      validatedSteps: 1,
      totalSteps: 2,
      locked: false,
      gateValidated: false,
    });
    expect(segments[1]).toMatchObject({
      segmentIndex: 2,
      locked: true,
    });
  });
});

describe("dispatchQaRouting", () => {
  it("records destinations without Slack token", async () => {
    const previous = process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_BOT_TOKEN;

    const result = await dispatchQaRouting({
      question: "How does provisioning work?",
      rules: [
        {
          id: "r1",
          tag: "ISC",
          destinationType: "slack",
          destinationAddress: "C123",
          label: null,
        },
      ],
      assetTitle: "Provisioning guide",
    });

    expect(result.sent).toBe(true);
    expect(result.destinations).toEqual(["slack:C123"]);

    process.env.SLACK_BOT_TOKEN = previous;
  });
});
