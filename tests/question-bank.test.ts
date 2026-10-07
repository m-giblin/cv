import { describe, expect, it } from "vitest";
import { pickRotation, questionHealth, shuffleChoices, sourceKey } from "@/lib/question-bank/model";

const q = (id: string, difficulty: "easy" | "medium" | "hard" = "medium") => ({ id, difficulty });
const fixedRandom = () => 0.5;

describe("pickRotation", () => {
  const now = Date.parse("2026-10-06T12:00:00Z");

  it("serves never-seen questions before seen ones", () => {
    const questions = [q("a"), q("b"), q("c"), q("d")];
    const lastSeen = new Map([
      ["a", "2026-10-05T12:00:00Z"],
      ["b", "2026-10-04T12:00:00Z"],
    ]);
    const picked = pickRotation(questions, lastSeen, 2, now, fixedRandom).map((item) => item.id);
    expect(picked.sort()).toEqual(["c", "d"]);
  });

  it("brings back the questions seen longest ago once everything has been seen", () => {
    const questions = [q("a"), q("b"), q("c")];
    const lastSeen = new Map([
      ["a", "2026-10-05T12:00:00Z"],
      ["b", "2026-08-01T12:00:00Z"],
      ["c", "2026-10-01T12:00:00Z"],
    ]);
    const picked = pickRotation(questions, lastSeen, 1, now, fixedRandom).map((item) => item.id);
    expect(picked).toEqual(["b"]);
  });

  it("mixes difficulties instead of serving one kind", () => {
    const questions = [q("e1", "easy"), q("e2", "easy"), q("e3", "easy"), q("h1", "hard"), q("m1", "medium")];
    const picked = pickRotation(questions, new Map(), 3, now, fixedRandom);
    expect(new Set(picked.map((item) => item.difficulty)).size).toBe(3);
  });

  it("returns fewer questions when the bank is small", () => {
    expect(pickRotation([q("a")], new Map(), 5, now)).toHaveLength(1);
  });
});

describe("questionHealth", () => {
  it("waits for enough answers", () => {
    expect(questionHealth({ shown: 2, correct: 2, picks: [2, 0, 0, 0] }, 0).flag).toBeNull();
  });
  it("flags questions nearly everyone gets right", () => {
    expect(questionHealth({ shown: 20, correct: 20, picks: [20, 0, 0, 0] }, 0).flag).toBe("too_easy");
  });
  it("flags questions nearly nobody gets right", () => {
    expect(questionHealth({ shown: 10, correct: 2, picks: [2, 3, 3, 2] }, 0).flag).toBe("too_hard");
  });
  it("flags a likely wrong answer key", () => {
    expect(questionHealth({ shown: 10, correct: 2, picks: [2, 8, 0, 0] }, 0).flag).toBe("answer_key");
  });
});

describe("shuffleChoices", () => {
  it("keeps track of the right answer", () => {
    let seed = 0.9;
    const shuffled = shuffleChoices(["right", "w1", "w2", "w3"], 0, () => (seed = (seed * 7.3) % 1));
    expect(shuffled.choices[shuffled.correctIndex]).toBe("right");
    expect([...shuffled.choices].sort()).toEqual(["right", "w1", "w2", "w3"]);
  });
});

describe("sourceKey", () => {
  it("groups docs topics regardless of case", () => {
    expect(sourceKey({ sourceKind: "docs", playbookId: null, topic: "Access Profiles " })).toBe(
      sourceKey({ sourceKind: "docs", playbookId: null, topic: "access profiles" }),
    );
  });
});
