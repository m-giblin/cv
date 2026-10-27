import { describe, expect, it } from "vitest";
import { certsCell, labCell, rampCell, segmentsCell } from "@/lib/manager/readiness-map-data";

describe("readiness map on someone's first day", () => {
  it("rates nothing critical just because the work hasn't started yet", () => {
    expect(rampCell(0, 1, "Kevin").level).not.toBe("critical");
    expect(segmentsCell(1, 1, "Kevin").level).not.toBe("critical");
    expect(certsCell(0, 1, "Kevin").level).not.toBe("critical");
    expect(labCell(0, "Kevin", 1).level).not.toBe("critical");
  });

  it("still flags people who have fallen behind", () => {
    expect(rampCell(5, 60, "Kevin").level).toBe("critical");
    expect(certsCell(0, 90, "Kevin").level).toBe("critical");
    expect(segmentsCell(1, 70, "Kevin").level).toBe("critical");
    expect(labCell(0, "Kevin", 30).level).toBe("critical");
  });
});
