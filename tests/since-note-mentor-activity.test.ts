import { describe, expect, it } from "vitest";
import { buildSinceFridayNote } from "@/lib/manager/since-note";
import type { ActivityLog } from "@/lib/types";

const log = (userId: string, createdAt: string, actorId: string | null = null): ActivityLog => ({
  id: `${userId}-${createdAt}`,
  userId,
  actorId,
  eventType: "plan_step_completed",
  title: "x",
  metadata: {},
  createdAt,
});

describe("buildSinceFridayNote quiet list", () => {
  const now = new Date("2026-10-27T18:00:00Z");
  const team = [
    { profileId: "matt", firstName: "Matt" },
    { profileId: "kevin", firstName: "Kevin" },
  ];

  it("counts a mentor's actions on the mentee's record as the mentor being active", () => {
    const note = buildSinceFridayNote(
      [log("matt", "2026-10-08T12:00:00Z"), log("kevin", "2026-10-27T15:00:00Z", "matt")],
      team,
      now,
    );
    expect(note.join(" ")).not.toContain("Matt has not been active");
  });

  it("still flags someone who really has gone quiet", () => {
    const note = buildSinceFridayNote([log("matt", "2026-10-08T12:00:00Z"), log("kevin", "2026-10-27T15:00:00Z")], team, now);
    expect(note.join(" ")).toContain("Matt has not been active since Oct 8");
  });
});
