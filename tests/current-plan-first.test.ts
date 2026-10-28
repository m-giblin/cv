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
});
