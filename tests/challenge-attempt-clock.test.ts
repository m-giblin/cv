import { describe, expect, it } from "vitest";
import { nextClockAction, startBlockedReason, workingDaysElapsed } from "@/lib/challenges/attempt-clock";

// 2026-11-06 is a Friday.
const friday = new Date("2026-11-06T15:00:00Z");
const attempt = { clock_started_at: friday.toISOString(), reminder_sent_at: null, warning_sent_at: null };
const at = (date: string) => new Date(`${date}T14:00:00Z`);

describe("workingDaysElapsed", () => {
  it("skips weekends", () => {
    expect(workingDaysElapsed(friday, at("2026-11-08"))).toBe(0);
    expect(workingDaysElapsed(friday, at("2026-11-09"))).toBe(1);
    expect(workingDaysElapsed(friday, at("2026-11-13"))).toBe(5);
  });
});

describe("nextClockAction", () => {
  it("does nothing before day 2", () => {
    expect(nextClockAction(attempt, at("2026-11-09"))).toBeNull();
  });

  it("reminds on day 2 once", () => {
    expect(nextClockAction(attempt, at("2026-11-10"))).toBe("remind");
    expect(nextClockAction({ ...attempt, reminder_sent_at: "x" }, at("2026-11-10"))).toBeNull();
  });

  it("warns on day 3 once", () => {
    expect(nextClockAction(attempt, at("2026-11-11"))).toBe("warn");
    expect(nextClockAction({ ...attempt, warning_sent_at: "x" }, at("2026-11-12"))).toBeNull();
  });

  it("cancels on day 5, even after a missed run", () => {
    expect(nextClockAction(attempt, at("2026-11-13"))).toBe("cancel");
    expect(nextClockAction(attempt, at("2026-11-20"))).toBe("cancel");
  });
});

describe("startBlockedReason", () => {
  it("allows a first start", () => {
    expect(startBlockedReason(null)).toBeNull();
  });

  it("blocks a canceled challenge until the manager allows a restart", () => {
    expect(startBlockedReason({ status: "canceled", restart_allowed_at: null })).toMatch(/manager/);
    expect(startBlockedReason({ status: "canceled", restart_allowed_at: "x" })).toBeNull();
  });

  it("blocks repeating an approved challenge", () => {
    expect(startBlockedReason({ status: "approved", restart_allowed_at: null })).toMatch(/completed/);
  });
});
