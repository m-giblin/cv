import { describe, expect, it } from "vitest";
import {
  inBounds,
  isDateOnly,
  matchesPhase,
  newestFirst,
  onboardingWindow,
  periodBounds,
  phaseOf,
  resolveRecordPeriod,
  startOfDayIn,
  summarizeScores,
} from "@/lib/record/period";

describe("resolveRecordPeriod", () => {
  it("covers the whole calendar month", () => {
    expect(resolveRecordPeriod("month", "2026-10-28")).toEqual({ preset: "month", from: "2026-10-01", to: "2026-10-31", label: "Oct 2026" });
    expect(resolveRecordPeriod("month", "2028-02-10")).toMatchObject({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("covers the calendar quarter", () => {
    expect(resolveRecordPeriod("quarter", "2026-10-28")).toMatchObject({ from: "2026-10-01", to: "2026-12-31", label: "Q4 2026" });
    expect(resolveRecordPeriod("quarter", "2026-01-01")).toMatchObject({ from: "2026-01-01", to: "2026-03-31", label: "Q1 2026" });
    expect(resolveRecordPeriod("quarter", "2026-06-30")).toMatchObject({ from: "2026-04-01", to: "2026-06-30", label: "Q2 2026" });
  });

  it("covers the calendar year", () => {
    expect(resolveRecordPeriod("year", "2026-10-28")).toMatchObject({ from: "2026-01-01", to: "2026-12-31", label: "2026" });
  });

  it("takes a custom range, swapping one given backwards", () => {
    expect(resolveRecordPeriod("custom", "2026-10-28", { from: "2026-09-15", to: "2026-08-01" })).toMatchObject({
      preset: "custom",
      from: "2026-08-01",
      to: "2026-09-15",
      label: "Aug 1, 2026 to Sep 15, 2026",
    });
  });

  it("falls back to this month when the custom range is invalid", () => {
    expect(resolveRecordPeriod("custom", "2026-10-28", { from: "2026-02-30", to: "2026-03-01" })).toMatchObject({ preset: "month", from: "2026-10-01" });
    expect(isDateOnly("2026-02-30")).toBe(false);
    expect(isDateOnly("2026-02-28")).toBe(true);
  });
});

describe("periodBounds", () => {
  it("starts and ends at the viewer's midnight", () => {
    // New York is UTC-4 in October (EDT).
    expect(periodBounds({ from: "2026-10-01", to: "2026-10-31" }, "America/New_York")).toEqual({
      start: "2026-10-01T04:00:00.000Z",
      end: "2026-11-01T04:00:00.000Z",
    });
  });

  it("honours a daylight-saving change inside the period", () => {
    // DST ends Nov 1, 2026: the quarter ends at EST midnight (UTC-5).
    expect(periodBounds({ from: "2026-10-01", to: "2026-12-31" }, "America/New_York").end).toBe("2027-01-01T05:00:00.000Z");
    expect(new Date(startOfDayIn("2026-11-02", "America/New_York")).toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });

  it("uses UTC for an unknown zone", () => {
    expect(periodBounds({ from: "2026-10-28", to: "2026-10-28" }, "Not/AZone")).toEqual({
      start: "2026-10-28T00:00:00.000Z",
      end: "2026-10-29T00:00:00.000Z",
    });
  });

  it("puts an evening event in the viewer's day, not UTC's", () => {
    const october = periodBounds({ from: "2026-10-01", to: "2026-10-31" }, "America/New_York");
    // 11:30 PM on Oct 31 in New York is already Nov 1 in UTC.
    expect(inBounds("2026-11-01T03:30:00.000Z", october)).toBe(true);
    expect(inBounds("2026-11-01T04:00:00.000Z", october)).toBe(false);
    expect(inBounds(null, october)).toBe(false);
  });
});

describe("onboarding phase", () => {
  const finished = onboardingWindow([
    { startDate: "2026-01-05", status: "completed", finishedAt: "2026-02-04T15:00:00Z" },
    { startDate: "2026-02-05", status: "completed", finishedAt: "2026-05-01T15:00:00Z" },
    { startDate: "2026-03-01", status: "cancelled", finishedAt: null },
  ]);

  it("runs from the first plan's start to the last plan's finish", () => {
    expect(finished).toEqual({ start: "2026-01-05", end: "2026-05-01T15:00:00Z" });
    expect(phaseOf("2026-03-10T12:00:00Z", finished)).toBe("onboarding");
    expect(phaseOf("2026-05-02T12:00:00Z", finished)).toBe("ongoing");
    expect(phaseOf("2025-12-20T12:00:00Z", finished)).toBe("ongoing");
  });

  it("stays open while any plan is unfinished", () => {
    const open = onboardingWindow([
      { startDate: "2026-10-28", status: "completed", finishedAt: "2026-10-28T05:38:35Z" },
      { startDate: "2026-10-28", status: "not_started", finishedAt: null },
    ]);
    expect(open).toEqual({ start: "2026-10-28", end: null });
    expect(phaseOf("2027-06-01T00:00:00Z", open)).toBe("onboarding");
  });

  it("treats everything as ongoing without a plan, unless it is onboarding by nature", () => {
    expect(onboardingWindow([])).toBeNull();
    expect(phaseOf("2026-10-28T12:00:00Z", null)).toBe("ongoing");
    expect(phaseOf("2026-10-28T12:00:00Z", null, true)).toBe("onboarding");
  });

  it("filters by phase", () => {
    const items = [{ phase: "onboarding" as const }, { phase: "ongoing" as const }];
    expect(items.filter((item) => matchesPhase(item, "all"))).toHaveLength(2);
    expect(items.filter((item) => matchesPhase(item, "onboarding"))).toEqual([{ phase: "onboarding" }]);
    expect(items.filter((item) => matchesPhase(item, "ongoing"))).toEqual([{ phase: "ongoing" }]);
  });
});

describe("summarizeScores", () => {
  it("counts every attempt and scores the scored ones", () => {
    expect(
      summarizeScores([
        { at: "2026-10-03", score: 60 },
        { at: "2026-10-01", score: null },
        { at: "2026-10-05", score: 80 },
      ]),
    ).toEqual({ count: 3, best: 80, average: 70, trend: "up", points: [60, 80] });
  });

  it("reads the trend from the later half against the earlier half", () => {
    expect(summarizeScores([80, 78, 70, 66].map((score, index) => ({ at: `2026-10-0${index + 1}`, score }))).trend).toBe("down");
    expect(summarizeScores([75, 72, 76].map((score, index) => ({ at: `2026-10-0${index + 1}`, score }))).trend).toBe("steady");
  });

  it("has no trend or scores with fewer than two scored attempts", () => {
    expect(summarizeScores([])).toEqual({ count: 0, best: null, average: null, trend: null, points: [] });
    expect(summarizeScores([{ at: "2026-10-01", score: 83 }])).toMatchObject({ best: 83, average: 83, trend: null });
  });
});

describe("newestFirst", () => {
  it("lists the latest first without changing the input", () => {
    const items = [{ at: "2026-10-01" }, { at: "2026-10-28" }, { at: "2026-10-15" }];
    expect(newestFirst(items).map((item) => item.at)).toEqual(["2026-10-28", "2026-10-15", "2026-10-01"]);
    expect(items[0]!.at).toBe("2026-10-01");
  });
});
