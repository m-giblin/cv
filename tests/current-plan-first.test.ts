import { describe, expect, it } from "vitest";
import { currentPlanFirst } from "@/lib/data/fetch-plans-bundle";

describe("currentPlanFirst", () => {
  it("puts the stage someone is on ahead of the one they finished", () => {
    const finished = { id: "days-1-30", status: "completed", start_date: "2026-10-28", created_at: "2026-10-28T04:36:53Z" };
    const current = { id: "days-31-60", status: "active", start_date: "2026-10-28", created_at: "2026-10-28T06:10:00Z" };
    expect([finished, current].sort(currentPlanFirst).map((plan) => plan.id)).toEqual(["days-31-60", "days-1-30"]);
  });

  it("orders the rest newest first", () => {
    const older = { id: "old", status: "completed", start_date: "2026-08-01", created_at: null };
    const newer = { id: "new", status: "completed", start_date: "2026-09-01", created_at: null };
    expect([older, newer].sort(currentPlanFirst).map((plan) => plan.id)).toEqual(["new", "old"]);
  });

  it("keeps a plan that starts later behind the one already under way", () => {
    const today = "2026-11-10";
    const sort = (rows: { id: string; status: string; start_date: string; created_at: string }[]) =>
      [...rows].sort((a, b) => currentPlanFirst(a, b, today)).map((plan) => plan.id);
    const month1 = { id: "mth1", status: "not_started", start_date: "2026-11-04", created_at: "2026-11-04T19:04:25Z" };
    const month2 = { id: "mth2", status: "not_started", start_date: "2026-11-30", created_at: "2026-11-04T19:05:04Z" };
    const month3 = { id: "mth3", status: "not_started", start_date: "2027-01-04", created_at: "2026-11-04T19:05:25Z" };
    expect(sort([month3, month2, month1])).toEqual(["mth1", "mth2", "mth3"]);
    // On month 2's start date it takes over, and month 1 stays ahead of month 3.
    expect([month3, month1, month2].sort((a, b) => currentPlanFirst(a, b, "2026-11-30")).map((plan) => plan.id)).toEqual([
      "mth2",
      "mth1",
      "mth3",
    ]);
  });
});
