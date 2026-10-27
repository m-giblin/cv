import { describe, expect, it } from "vitest";
import { nearestWeekday } from "@/lib/utils/date-only";

describe("nearestWeekday", () => {
  it("leaves weekdays alone", () => {
    expect(nearestWeekday("2026-10-29")).toBe("2026-10-29");
  });

  it("moves Saturday back to Friday and Sunday on to Monday", () => {
    expect(nearestWeekday("2026-10-31")).toBe("2026-10-30");
    expect(nearestWeekday("2026-11-01")).toBe("2026-11-02");
  });

  it("keeps consecutive dates in order", () => {
    const run = ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"].map(nearestWeekday);
    expect([...run].sort()).toEqual(run);
  });
});
