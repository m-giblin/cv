import { describe, expect, it } from "vitest";
import { isMixQuiz, pickMix, pickRotation, questionHealth, shuffleChoices, sourceKey } from "@/lib/question-bank/model";

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

describe("pickMix", () => {
  const now = Date.parse("2026-11-03T12:00:00Z");
  // Five docs topics, four questions each.
  const bank = ["alpha", "beta", "gamma", "delta", "epsilon"].flatMap((topic) =>
    [1, 2, 3, 4].map((n) => ({ id: `${topic}-${n}`, difficulty: "medium" as const, sourceKind: "docs" as const, playbookId: null, topic })),
  );
  const topicOf = (id: string) => id.split("-")[0];

  it("spreads across sources, at most two from each", () => {
    const picked = pickMix(bank, new Map(), new Map(), new Set(), 10, now, fixedRandom);
    expect(picked).toHaveLength(10);
    const perTopic = new Map<string, number>();
    for (const question of picked) perTopic.set(topicOf(question.id)!, (perTopic.get(topicOf(question.id)!) ?? 0) + 1);
    expect([...perTopic.values()].every((count) => count === 2)).toBe(true);
  });

  it("leads with assigned chapters, then the weakest topics, then untried, then strongest", () => {
    const results = new Map([
      ["docs:beta", { shown: 10, correct: 9 }],
      ["docs:gamma", { shown: 10, correct: 3 }],
      ["docs:delta", { shown: 2, correct: 0 }], // too few answers to judge: counts as untried
    ]);
    const picked = pickMix(bank, new Map(), results, new Set(["docs:epsilon"]), 3, now, fixedRandom);
    expect(picked.map((question) => topicOf(question.id)).sort()).toEqual(["alpha", "epsilon", "gamma"].sort());
    const withStrong = pickMix(bank, new Map(), results, new Set(["docs:epsilon"]), 5, now, fixedRandom).map((question) => topicOf(question.id));
    expect(withStrong).toContain("delta");
    expect(withStrong).toContain("beta");
  });

  it("serves questions not seen recently within each source", () => {
    const lastSeen = new Map(["alpha-1", "alpha-2", "alpha-3"].map((id) => [id, "2026-11-01T00:00:00Z"]));
    const picked = pickMix(bank.filter((question) => question.topic === "alpha"), lastSeen, new Map(), new Set(), 1, now, fixedRandom);
    expect(picked.map((question) => question.id)).toEqual(["alpha-4"]);
  });

  it("tells a mix from a topic check by its sources", () => {
    expect(isMixQuiz(["docs:alpha", "docs:alpha"])).toBe(false);
    expect(isMixQuiz(["docs:alpha", "playbook:p1"])).toBe(true);
  });
});
