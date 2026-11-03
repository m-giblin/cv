import { describe, expect, it } from "vitest";
import { optionOrder, originalOptionIndex, presentQuestion } from "@/lib/assessments/flight-check-engine";
import { FLIGHT_CHECK_BANK } from "@/lib/assessments/flight-check-questions";

const choiceQuestions = FLIGHT_CHECK_BANK.filter((question) => question.options?.length && typeof question.correctIndex === "number");

describe("flight check option order", () => {
  it("is a stable shuffle of every option for a session and question", () => {
    const order = optionOrder("session-a", "disc-1", 4);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    expect(optionOrder("session-a", "disc-1", 4)).toEqual(order);
  });

  it("puts the right answer on different letters across sessions", () => {
    const question = choiceQuestions[0]!;
    const letters = new Set(
      Array.from({ length: 40 }, (_, index) => {
        const shown = presentQuestion(question, `session-${index}`)!;
        return shown.options!.indexOf(question.options![question.correctIndex!]!);
      }),
    );
    expect(letters.size).toBeGreaterThanOrEqual(3);
  });

  it("doesn't put every answer on one letter within a session", () => {
    const letters = new Set(
      choiceQuestions.map((question) => presentQuestion(question, "session-b")!.options!.indexOf(question.options![question.correctIndex!]!)),
    );
    expect(letters.size).toBeGreaterThan(1);
  });

  it("maps the option a person picked back to the bank, and a skip to no option", () => {
    for (const question of choiceQuestions) {
      const shown = presentQuestion(question, "session-c")!;
      const shownRight = shown.options!.indexOf(question.options![question.correctIndex!]!);
      expect(originalOptionIndex(question, "session-c", shownRight)).toBe(question.correctIndex);
    }
    expect(originalOptionIndex(choiceQuestions[0]!, "session-c", -1)).toBe(-1);
  });

  it("never sends the answer key or hint to the browser", () => {
    const shown = presentQuestion(choiceQuestions[0]!, "session-d")!;
    expect(shown).not.toHaveProperty("correctIndex");
    expect(shown).not.toHaveProperty("rubricHint");
    expect(presentQuestion(null, "session-d")).toBeNull();
  });
});
