import { describe, expect, it } from "vitest";
import {
  bizToDate,
  businessDaysBetween,
  offsetToX,
  shiftBizOffsetByCalendarDrag,
} from "@/lib/plans/business-days";

describe("business-days", () => {
  it("converts business day offsets to calendar dates", () => {
    expect(bizToDate("2026-01-05", 1)).toBe("2026-01-06");
    expect(bizToDate("2026-01-09", 1)).toBe("2026-01-12");
  });

  it("counts business days between dates", () => {
    expect(businessDaysBetween("2026-01-05", "2026-01-12")).toBe(5);
  });

  it("maps offsets to gantt x positions", () => {
    expect(offsetToX("2026-01-05", 5, 22)).toBeGreaterThan(0);
  });

  it("shifts offsets when dragging on calendar grid", () => {
    expect(shiftBizOffsetByCalendarDrag(10, 7)).toBeGreaterThan(10);
    expect(shiftBizOffsetByCalendarDrag(3, -7)).toBe(1);
  });
});
