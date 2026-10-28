import { describe, expect, it } from "vitest";
import { holidayOn, nearestWeekday } from "@/lib/utils/date-only";

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

  it("moves holidays to the workday before", () => {
    expect(nearestWeekday("2026-11-26")).toBe("2026-11-25"); // Thanksgiving
    expect(nearestWeekday("2026-11-27")).toBe("2026-11-25"); // the day after
    expect(nearestWeekday("2026-12-25")).toBe("2026-12-24"); // Christmas, a Friday
    expect(nearestWeekday("2027-01-17")).toBe("2027-01-15"); // Sunday before MLK Day goes back to Friday
    expect(nearestWeekday("2027-01-18")).toBe("2027-01-15"); // MLK Day
  });

  it("keeps a run across Thanksgiving in order", () => {
    const run = ["2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29", "2026-11-30"].map(nearestWeekday);
    expect([...run].sort()).toEqual(run);
    expect(run).toEqual(["2026-11-24", "2026-11-25", "2026-11-25", "2026-11-25", "2026-11-25", "2026-11-30", "2026-11-30"]);
  });
});

describe("holidayOn", () => {
  it("names US company holidays, observed on a weekday", () => {
    expect(holidayOn("2026-11-26")).toBe("Thanksgiving");
    expect(holidayOn("2026-07-03")).toBe("Independence Day"); // July 4 2026 is a Saturday
    expect(holidayOn("2026-05-25")).toBe("Memorial Day");
    expect(holidayOn("2026-09-07")).toBe("Labor Day");
    expect(holidayOn("2026-11-11")).toBeNull();
  });
});
