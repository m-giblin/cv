import { describe, expect, it } from "vitest";
import { heavierWeek, lighterWeek, typicalWeek, weekOf } from "@/lib/manager/week-load";

// A ramp with 2–3 steps most weeks and one heavy week (Nov 2–6), like a Days 1–30 stage.
const ramp = [
  "2026-10-29", "2026-10-30",
  "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-06",
  "2026-11-09", "2026-11-10", "2026-11-12",
  "2026-11-16", "2026-11-18",
  "2026-11-24",
];

describe("week load", () => {
  it("keys weeks by Monday", () => {
    expect(weekOf("2026-11-13")).toBe("2026-11-09");
    expect(weekOf("2026-11-09")).toBe("2026-11-09");
    expect(weekOf("2026-11-15")).toBe("2026-11-09");
  });

  it("finds the usual week, counting empty weeks", () => {
    expect(typicalWeek(ramp, "2026-10-27")).toBe(2);
    expect(typicalWeek([], "2026-10-27")).toBe(0);
  });

  it("warns only for a week clearly heavier than usual", () => {
    expect(heavierWeek(ramp, "2026-11-04", "2026-10-27")).toEqual({ count: 6, typical: 2 });
    // One step over the usual week is ordinary variation.
    expect(heavierWeek(ramp, "2026-11-13", "2026-10-27")).toBeNull();
    expect(heavierWeek(ramp, "2026-11-20", "2026-10-27")).toBeNull();
    expect(heavierWeek([], "2026-11-20", "2026-10-27")).toBeNull();
  });

  it("suggests the lightest of the next weeks, due that Friday", () => {
    expect(lighterWeek([ramp], "2026-11-04")).toEqual({ week: "2026-11-23", count: 1, friday: "2026-11-27" });
    // Nothing lighter after an already light week.
    expect(lighterWeek([[]], "2026-11-04")).toBeNull();
  });

  it("adds up everyone picked", () => {
    expect(lighterWeek([ramp, ["2026-11-24", "2026-11-25", "2026-11-26"]], "2026-11-04")).toEqual({ week: "2026-11-16", count: 2, friday: "2026-11-20" });
  });
});
