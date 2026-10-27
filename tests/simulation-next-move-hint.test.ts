import { describe, expect, it } from "vitest";
import { goalTouched, nextMoveHint } from "@/lib/simulations/next-move-hint";
import { simulationRubricCriteria } from "@/lib/simulations/session-rubric";
import type { SimulationAssignment } from "@/lib/types";

type Entry = SimulationAssignment["transcript"][number];
const roleplay = simulationRubricCriteria({});
const opening: Entry = { speaker: "persona", message: "Marcus Hale: Thanks for coming. What did you want to cover?" };

describe("nextMoveHint", () => {
  it("starts with the approval chain", () => {
    expect(nextMoveHint([opening], roleplay)).toMatchObject({ source: "move", text: expect.stringMatching(/approval chain/i) });
  });

  it("moves on once the learner probes the approval chain", () => {
    const messages: Entry[] = [
      opening,
      { speaker: "se", message: "Who signs off on identity governance spend, and who else is involved?" },
      { speaker: "persona", message: "The CIO and our deputy director. Procurement gets a say." },
    ];
    const hint = nextMoveHint(messages, roleplay);
    expect(hint.text).not.toMatch(/approval chain/i);
    expect(hint.text).toMatch(/urgency/i);
  });

  it("keeps advancing through the moves", () => {
    const messages: Entry[] = [
      opening,
      { speaker: "se", message: "Who approves this budget?" },
      { speaker: "persona", message: "The CIO." },
      { speaker: "se", message: "What audit deadline is driving this?" },
      { speaker: "persona", message: "March." },
      { speaker: "se", message: "How do you handle access reviews today?" },
      { speaker: "persona", message: "Spreadsheets." },
    ];
    expect(nextMoveHint(messages, roleplay).text).toMatch(/size the pain/i);
  });

  it("coaches the objection when the buyer just pushed back", () => {
    const messages: Entry[] = [opening, { speaker: "se", message: "Who approves this?" }, { speaker: "persona", message: "Honestly, we already have Okta. Not sure why we'd add another platform." }];
    expect(nextMoveHint(messages, roleplay).source).toBe("objection");
  });

  it("shows the AI's HINT: answer until the learner replies again", () => {
    const withHint: Entry[] = [
      opening,
      { speaker: "se", message: "HINT: what should I ask?" },
      { speaker: "coach", message: 'Try: "What would a failed audit cost you this year?"' },
    ];
    expect(nextMoveHint(withHint, roleplay)).toEqual({ source: "coach", text: 'Try: "What would a failed audit cost you this year?"' });
    const after: Entry[] = [...withHint, { speaker: "se", message: "What would a failed audit cost you?" }, { speaker: "persona", message: "A lot." }];
    expect(nextMoveHint(after, roleplay).source).not.toBe("coach");
  });

  it("walks a scenario's own scoring goals in order", () => {
    const goals = [
      { label: "Ask what actually tells IT that someone changed departments", description: "" },
      { label: "Uncover that old access stays after a transfer", description: "" },
    ];
    expect(nextMoveHint([opening], goals).text).toMatch(/^Next goal: Ask what actually tells IT/);
    const messages: Entry[] = [
      opening,
      { speaker: "se", message: "When someone changes departments, what tells IT that it happened?" },
      { speaker: "persona", message: "HR updates the record." },
    ];
    expect(nextMoveHint(messages, goals).text).toBe("Next goal: Uncover that old access stays after a transfer. (1 of 2 goals touched)");
    expect(
      nextMoveHint([...messages, { speaker: "se", message: "Does their old access stay after the transfer?" }], goals).source,
    ).toBe("done");
  });
});

describe("goalTouched", () => {
  it("matches on shared key words, not exact phrasing", () => {
    expect(goalTouched("Uncover that old access stays after a transfer", "so the old access just stays when they transfer?")).toBe(true);
    expect(goalTouched("Uncover that old access stays after a transfer", "tell me about your budget")).toBe(false);
  });
});
