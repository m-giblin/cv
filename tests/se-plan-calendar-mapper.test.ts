import { describe, expect, it } from "vitest";
import { plans } from "@/lib/demo-data";
import {
  calendarMonthFromWeeks,
  milestoneStatusForStep,
  userPlanToCalWeeks,
} from "@/lib/se/plan-calendar-mapper";

describe("plan-calendar-mapper", () => {
  it("maps dated plan steps into week groups", () => {
    const alexPlan = plans.find((plan) => plan.userId === "alex");
    expect(alexPlan).toBeDefined();

    const weeks = userPlanToCalWeeks(alexPlan!);
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks[0]?.milestones.length).toBeGreaterThan(0);
    expect(weeks[0]?.milestones[0]?.date).toBeTruthy();
  });

  it("marks completed steps as DONE", () => {
    const alexPlan = plans.find((plan) => plan.userId === "alex");
    const completedStep = alexPlan!.steps.find(
      (step) => step.status === "completed" || step.status === "reviewed",
    );
    expect(completedStep).toBeDefined();
    expect(
      milestoneStatusForStep({ ...completedStep!, dueDate: "2026-07-01" }, new Date("2026-07-20")),
    ).toBe("DONE");
  });

  it("derives month metadata from milestone dates", () => {
    const alexPlan = plans.find((plan) => plan.userId === "alex");
    const weeks = userPlanToCalWeeks(alexPlan!);
    const monthMeta = calendarMonthFromWeeks(weeks);

    expect(monthMeta.year).toBe(2026);
    expect(monthMeta.month).toBeGreaterThan(0);
    expect(monthMeta.monthLabel).toContain("2026");
  });
});

describe("buildMonthGrid", () => {
  it("puts a calendar day on that day and leaves other months out", async () => {
    const { buildMonthGrid } = await import("@/components/se/plan-calendar/utils/calendarGrid");
    const milestone = (date: string, title: string) => ({ day: "", title, type: "Pitch", status: "UPCOMING" as const, icon: "", date });
    const days = buildMonthGrid(2026, 11, [milestone("2026-11-02", "Pitch"), milestone("2026-10-29", "October step")]);
    const byDay = (day: number) => days.find((cell) => cell.day === day)?.events.map((event) => event.title) ?? [];
    expect(byDay(2)).toEqual(["Pitch"]);
    expect(byDay(1)).toEqual([]);
    expect(byDay(29)).toEqual([]);
  });
});
