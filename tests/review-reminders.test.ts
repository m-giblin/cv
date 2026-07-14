import { describe, expect, it } from "vitest";
import { computeReminderEligibility } from "@/lib/reviews/review-reminder-service";

describe("review reminder eligibility", () => {
  const now = new Date("2026-07-12T12:00:00.000Z");

  it("blocks reminders before minimum pending days", () => {
    const submittedAt = "2026-07-10T12:00:00.000Z";
    const result = computeReminderEligibility(submittedAt, null, now);
    expect(result.canSend).toBe(false);
    expect(result.pendingDays).toBe(2);
  });

  it("allows reminders after 5 pending days with no prior nudge", () => {
    const submittedAt = "2026-07-05T12:00:00.000Z";
    const result = computeReminderEligibility(submittedAt, null, now);
    expect(result.canSend).toBe(true);
    expect(result.pendingDays).toBe(7);
  });

  it("enforces 7-day cooldown per review item", () => {
    const submittedAt = "2026-07-01T12:00:00.000Z";
    const lastReminderAt = "2026-07-10T12:00:00.000Z";
    const result = computeReminderEligibility(submittedAt, lastReminderAt, now);
    expect(result.canSend).toBe(false);
    expect(result.nextReminderAt).toBeTruthy();
  });

  it("allows another reminder after cooldown expires", () => {
    const submittedAt = "2026-07-01T12:00:00.000Z";
    const lastReminderAt = "2026-07-01T12:00:00.000Z";
    const result = computeReminderEligibility(submittedAt, lastReminderAt, now);
    expect(result.canSend).toBe(true);
  });
});
