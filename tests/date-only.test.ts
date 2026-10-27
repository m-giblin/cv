import { describe, expect, it } from "vitest";
import { isPastDue, parseDateOnly } from "@/lib/utils/date-only";

describe("date-only helpers", () => {
  it("keeps a calendar day on the same day in local time", () => {
    const date = parseDateOnly("2026-10-29");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 29]);
  });

  it("is not overdue on the due day itself", () => {
    expect(isPastDue("2026-10-29", new Date(2026, 9, 29, 23, 0))).toBe(false);
    expect(isPastDue("2026-10-29", new Date(2026, 9, 30, 0, 30))).toBe(true);
  });
});
