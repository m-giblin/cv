import { describe, expect, it } from "vitest";
import { loadUpcomingOneOnOnes } from "@/lib/manager/one-on-ones";

function fakeAdmin(rows: unknown[]) {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: async () => ({ data: rows }),
  };
  return { from: () => query } as never;
}

const row = (id: string, start: string, minutes = 30) => ({
  id,
  actor_id: "manager-1",
  created_at: "2026-10-27T12:00:00Z",
  metadata: { start, minutes, label: `label ${id}`, scheduled_by_name: "Bill Smith", mentor_invited: id === "b" },
});

describe("loadUpcomingOneOnOnes", () => {
  const now = new Date("2026-10-28T15:10:00Z");

  it("keeps meetings that haven't ended, soonest first", async () => {
    const result = await loadUpcomingOneOnOnes(
      fakeAdmin([row("c", "2026-11-03T14:00:00Z"), row("a", "2026-10-28T15:00:00Z"), row("b", "2026-10-29T14:00:00Z")]),
      "kevin",
      now,
    );
    expect(result.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(result[1]).toMatchObject({ scheduledByName: "Bill Smith", mentorInvited: true, minutes: 30 });
  });

  it("drops meetings that are over and rows without a start", async () => {
    const result = await loadUpcomingOneOnOnes(
      fakeAdmin([row("past", "2026-10-28T14:00:00Z"), { id: "x", actor_id: null, created_at: "", metadata: {} }]),
      "kevin",
      now,
    );
    expect(result).toEqual([]);
  });
});
