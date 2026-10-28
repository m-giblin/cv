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

  it("moves past a goal the learner covered in their own words", () => {
    const goals = [
      { label: "Open by asking for a count of service accounts and pause for the answer", description: "" },
      { label: "Find out who owns the account the case-management system uses to reach payroll and what happens when an owner leaves", description: "" },
      { label: "Learn whether retired integrations and old passwords are cleaned up", description: "" },
      { label: "Explain discovery, grouping, and human ownership only after those gaps are on the table", description: "" },
    ];
    const messages: Entry[] = [
      opening,
      { speaker: "se", message: "How many service accounts do you have in Active Directory today?" },
      { speaker: "persona", message: "Honestly, no idea." },
    ];
    expect(nextMoveHint(messages, goals).text).toMatch(/^Next goal: Find out who owns the account the case-management system uses.*\(1 of 4 goals touched\)$/);
    const further: Entry[] = [
      ...messages,
      { speaker: "se", message: "Who owns the payroll account the case-management system uses, and what happens when that owner leaves?" },
      { speaker: "persona", message: "It just keeps running." },
      { speaker: "se", message: "When an integration is retired, are its accounts and old passwords cleaned up?" },
      { speaker: "persona", message: "Not really." },
    ];
    expect(nextMoveHint(further, goals).text).toMatch(/^Next goal: Explain discovery, grouping, and human ownership.*\(3 of 4 goals touched\)$/);
    const all: Entry[] = [
      ...further,
      { speaker: "se", message: "We can discover those accounts, group them by application, and give each a human owner." },
    ];
    expect(nextMoveHint(all, goals)).toMatchObject({ source: "done", text: expect.stringMatching(/End & get feedback/) });
  });
});

describe("goalTouched", () => {
  it("matches on shared key words, not exact phrasing", () => {
    expect(goalTouched("Uncover that old access stays after a transfer", "so the old access just stays when they transfer?")).toBe(true);
    expect(goalTouched("Uncover that old access stays after a transfer", "tell me about your budget")).toBe(false);
  });

  it("ignores how the goal says to work and reads \"how many\" as a count", () => {
    expect(goalTouched("Open by asking for a count of service accounts and pause for the answer", "How many service accounts are there?")).toBe(true);
    expect(goalTouched("Open by asking for a count of service accounts and pause for the answer", "Please pause and let me answer")).toBe(false);
  });
});
