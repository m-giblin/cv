import { describe, expect, it } from "vitest";
import { entryInFilter, entryMatches, groupByDay, scoreTone, summarizeRecord, type RecordEntry } from "@/lib/record/record-model";

function entry(overrides: Partial<RecordEntry> & Pick<RecordEntry, "id" | "kind" | "at">): RecordEntry {
  return {
    title: "Item",
    subtitle: "",
    phase: "onboarding",
    headline: null,
    scores: [],
    notes: [],
    facts: [],
    lists: [],
    texts: [],
    open: null,
    ...overrides,
  };
}

const gateA = entry({
  id: "gate:a",
  kind: "gate",
  at: "2026-10-28T13:00:00Z",
  title: "Test out: the basic demo",
  headline: { value: "4/5", tone: "good" },
  facts: [{ label: "Confidence", value: "4 of 5" }],
  notes: [
    { label: "Strength", body: "Ran the demo end to end without help." },
    { label: "Next action", body: "Shorten the narration when a connector is slow.", author: "Kathy Jones", at: "2026-10-28T13:00:00Z" },
  ],
});
const gateB = entry({
  id: "gate:b",
  kind: "gate",
  at: "2026-10-28T05:00:00Z",
  headline: { value: "Sent back", tone: "bad" },
  facts: [{ label: "Confidence", value: "3 of 5" }],
});
const pitches = [83, 75].map((score, index) =>
  entry({ id: `pitch:${index}`, kind: "pitch", at: `2026-10-28T${index ? "11" : "04"}:00:00Z`, scores: [{ label: "Overall", score, pass: index ? 70 : null }] }),
);
const work = entry({
  id: "work:ch4",
  kind: "work",
  at: "2026-10-28T11:45:00Z",
  title: "Ch. 4 Continuous Compliance",
  scores: [
    { label: "Pitch drill", score: 75, pass: 70 },
    { label: "Knowledge check", score: 100, pass: 80 },
  ],
});
const checkin = entry({
  id: "mentor:1",
  kind: "mentor",
  at: "2026-10-28T04:40:00Z",
  notes: [{ label: "Next actions", body: "Explain joiner, mover and leaver without ERP terms." }],
});

describe("summarizeRecord", () => {
  const summary = summarizeRecord([gateA, gateB, ...pitches, work, checkin]);

  it("counts by kind and averages gate confidence", () => {
    expect(summary.counts).toMatchObject({ gate: 2, pitch: 2, work: 1, mentor: 1, stage: 0 });
    expect(summary.gates).toEqual({ approved: 1, sentBack: 1, averageConfidence: 3.5 });
  });

  it("summarises practice from each entry's first score", () => {
    expect(summary.practice.pitches).toMatchObject({ count: 2, best: 83, average: 79, trend: "down" });
    expect(summary.practice.checks.count).toBe(0);
  });

  it("finds the score closest to its pass mark", () => {
    expect(summary.closestCall).toEqual({ entryId: "pitch:1", label: "Overall, Item", score: 75, pass: 70 });
  });

  it("collects next actions, newest first", () => {
    expect(summary.followUps.map((item) => item.entryId)).toEqual(["gate:a", "mentor:1"]);
    expect(summary.followUps[0]).toMatchObject({ body: "Shorten the narration when a connector is slow.", author: "Kathy Jones" });
  });

  it("is empty for an empty period", () => {
    const empty = summarizeRecord([]);
    expect(empty.gates.averageConfidence).toBeNull();
    expect(empty.closestCall).toBeNull();
    expect(empty.followUps).toEqual([]);
  });
});

describe("entryMatches", () => {
  it("searches titles and the text of notes, all words required", () => {
    expect(entryMatches(gateA, "")).toBe(true);
    expect(entryMatches(gateA, "basic demo")).toBe(true);
    expect(entryMatches(gateA, "CONNECTOR slow")).toBe(true);
    expect(entryMatches(gateA, "kathy")).toBe(true);
    expect(entryMatches(gateA, "connector copilot")).toBe(false);
  });
});

describe("entryInFilter", () => {
  it("groups practice and meetings, and finds anything with notes", () => {
    expect(entryInFilter(pitches[0]!, "practice")).toBe(true);
    expect(entryInFilter(checkin, "meetings")).toBe(true);
    expect(entryInFilter(gateA, "gate")).toBe(true);
    expect(entryInFilter(gateA, "work")).toBe(false);
    expect(entryInFilter(gateA, "notes")).toBe(true);
    expect(entryInFilter(gateB, "notes")).toBe(false);
    expect(entryInFilter(gateB, "all")).toBe(true);
  });
});

describe("groupByDay", () => {
  it("puts the newest day first and keeps items newest first within a day", () => {
    const groups = groupByDay([
      { id: "a", at: "2026-10-27T15:00:00Z" },
      { id: "b", at: "2026-10-28T09:00:00Z" },
      { id: "c", at: "2026-10-28T15:00:00Z" },
    ]);
    expect(groups.map((group) => [group.day, group.entries.map((item) => item.id)])).toEqual([
      ["2026-10-28", ["c", "b"]],
      ["2026-10-27", ["a"]],
    ]);
  });

  it("uses the reader's calendar day when given one", () => {
    // 1 AM UTC on Oct 29 is still Oct 28 in New York.
    const newYorkDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    expect(groupByDay([{ at: "2026-10-29T01:00:00Z" }], newYorkDay)[0]!.day).toBe("2026-10-28");
  });
});

describe("scoreTone", () => {
  it("reads against the pass mark when there is one", () => {
    expect(scoreTone(75, 70)).toBe("warn");
    expect(scoreTone(90, 70)).toBe("good");
    expect(scoreTone(65, 70)).toBe("bad");
    expect(scoreTone(65)).toBe("warn");
    expect(scoreTone(null)).toBe("neutral");
  });
});
