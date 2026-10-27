import { describe, expect, it } from "vitest";
import {
  MENTOR_EVENT,
  buildMenteeRecords,
  formatDueDate,
  latestDueDate,
  localToday,
  scheduleOrderWarnings,
} from "@/lib/mentoring/mentor-records-model";

describe("mentor-set schedules", () => {
  it("reads a schedule the mentor set into the records", () => {
    const records = buildMenteeRecords(
      [
        {
          id: "e1",
          user_id: "kevin",
          actor_id: "matt",
          event_type: MENTOR_EVENT.dateSet,
          created_at: "2026-10-28T15:00:00Z",
          metadata: {
            assignment_id: "a1",
            plan_name: "Days 1–30",
            scope: "schedule",
            note: "Agreed in our first meeting",
            last_due: "2026-12-04",
            changes: [{ assignment_step_id: "s1", step_title: "Learn the Corp Deck", from: "2026-11-24", to: "2026-12-01" }],
          },
        },
      ],
      (id) => (id === "matt" ? "Matt Giblin" : "Someone"),
    );
    expect(records.scheduleChanges).toHaveLength(1);
    expect(records.scheduleChanges[0]).toMatchObject({
      assignmentId: "a1",
      scope: "schedule",
      lastDue: "2026-12-04",
      setByName: "Matt Giblin",
      changes: [{ assignmentStepId: "s1", stepTitle: "Learn the Corp Deck", from: "2026-11-24", to: "2026-12-01" }],
    });
  });

  it("formats a date-only value on its own day, whatever the time zone", () => {
    expect(formatDueDate("2026-10-29")).toBe("Oct 29");
    expect(formatDueDate(null)).toBe("no date");
  });

  it("warns when a later step is due before an earlier one", () => {
    const warnings = scheduleOrderWarnings([
      { id: "1", title: "Separate people from non-human accounts", order: 18, due: "2026-11-24" },
      { id: "2", title: "Learn the Corp Deck", order: 19, due: "2026-11-21" },
      { id: "3", title: "Test out: the Corp Deck", order: 20, due: "2026-11-25" },
    ]);
    expect(warnings).toEqual(["Learn the Corp Deck is due before Separate people from non-human accounts, which comes earlier in the plan."]);
  });

  it("ends the stage on the latest due date", () => {
    expect(latestDueDate(["2026-11-24", null, "2026-12-04", "2026-11-30"])).toBe("2026-12-04");
    expect(latestDueDate([])).toBeNull();
  });

  it("gives today in local time", () => {
    expect(localToday(new Date(2026, 9, 27, 23, 30))).toBe("2026-10-27");
  });
});
