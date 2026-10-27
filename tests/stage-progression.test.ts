import { describe, expect, it } from "vitest";
import { stageAfter, stageBefore } from "@/lib/plans/stage-progression";

const stages = [
  { segmentIndex: 1, planId: "foundation" },
  { segmentIndex: 2, planId: "sixty" },
  { segmentIndex: 3, planId: "ninety" },
  { segmentIndex: 4, planId: "one-twenty" },
];

describe("program stage order", () => {
  it("finds the next stage and stops after the last one", () => {
    expect(stageAfter(stages, "foundation")?.planId).toBe("sixty");
    expect(stageAfter(stages, "ninety")?.planId).toBe("one-twenty");
    expect(stageAfter(stages, "one-twenty")).toBeNull();
  });

  it("finds the previous stage and stops before the first one", () => {
    expect(stageBefore(stages, "sixty")?.planId).toBe("foundation");
    expect(stageBefore(stages, "foundation")).toBeNull();
    expect(stageBefore(stages, "missing")).toBeNull();
  });
});
