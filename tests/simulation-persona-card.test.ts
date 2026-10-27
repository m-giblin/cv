import { describe, expect, it } from "vitest";
import {
  assignmentForSession,
  parsePersonaCard,
  personaCardLabel,
  stripPersonaCard,
  transcriptForDisplay,
} from "@/lib/simulations/persona-card";
import {
  LEGACY_SIMULATION_START_MESSAGE,
  SIMULATION_START_MESSAGE,
  SLED_ROLEPLAY_TEMPLATE,
  withPrivatePersonaCard,
} from "@/lib/simulations/prompt-template";
import type { SimulationAssignment } from "@/lib/types";

const PIPE_CARD =
  'Name: Marcus Hale | Title: CISO | Org type: State agency (SLG) | Top Priority This Quarter: Audit readiness | Attitude Toward Vendors: Wary | Secret Fear: Another failed IAM rollout | Opening Move: "We keep failing audits."\n\n--- ROLEPLAY BEGINS ---\nMarcus Hale: Before we go deep, why should we talk about identity now?';

const MARKDOWN_CARD =
  "**STEP 1 — PERSONA CARD**\n\n**Name:** Alex Rivera  \n**Title:** Director of Identity & Access Management, University of South Florida  \n**Hot Buttons:** Budget scrutiny.  \n**Trigger Phrase:** “We already have Okta for SSO…”\n\n**STEP 2 — DIFFICULTY BEHAVIOR** (applied internally)  \nIntermediate difficulty.\n\n**STEP 3**  \n--- ROLEPLAY BEGINS ---\n\nAlex Rivera: Thanks for taking the time. We already rolled out Okta.";

describe("stripPersonaCard", () => {
  it("keeps only what the buyer says after ROLEPLAY BEGINS", () => {
    expect(stripPersonaCard(PIPE_CARD)).toBe("Marcus Hale: Before we go deep, why should we talk about identity now?");
    expect(stripPersonaCard(MARKDOWN_CARD)).toBe("Alex Rivera: Thanks for taking the time. We already rolled out Okta.");
  });

  it("never leaves hidden fields in the visible text", () => {
    for (const message of [PIPE_CARD, MARKDOWN_CARD]) {
      const shown = stripPersonaCard(message);
      expect(shown).not.toMatch(/Secret Fear|Opening Move|Hot Buttons|PERSONA CARD|ROLEPLAY BEGINS/);
    }
  });

  it("drops a card block that has no marker, line by line", () => {
    const text = "STEP 1 — PERSONA CARD\nName: Dana Wu\nTitle: CIO\nSecret Fear: Losing the CFO's trust\n\nDana Wu: You have ten minutes.";
    expect(stripPersonaCard(text)).toBe("Dana Wu: You have ten minutes.");
  });

  it("falls back to the opening move when only the card was printed", () => {
    expect(stripPersonaCard('Name: Dana Wu | Title: CIO | Secret Fear: x | Opening Move: "You have ten minutes."\n--- ROLEPLAY BEGINS ---')).toBe(
      "You have ten minutes.",
    );
  });

  it("leaves ordinary messages alone", () => {
    const text = "Jordan Hale: Access is fine here. New people get accounts on day one.";
    expect(stripPersonaCard(text)).toBe(text);
  });
});

describe("parsePersonaCard", () => {
  it("reads the pipe card, the markdown card and the short PERSONA line", () => {
    expect(parsePersonaCard(PIPE_CARD)).toEqual({ name: "Marcus Hale", title: "CISO", org: "State agency (SLG)" });
    expect(parsePersonaCard(MARKDOWN_CARD)).toMatchObject({ name: "Alex Rivera", org: null });
    expect(parsePersonaCard("PERSONA: Marcus Hale | CISO | State agency\n--- ROLEPLAY BEGINS ---\nHi.")).toEqual({
      name: "Marcus Hale",
      title: "CISO",
      org: "State agency",
    });
    expect(parsePersonaCard("Hello there")).toBeNull();
  });

  it("labels the persona without repeating the org", () => {
    expect(personaCardLabel({ name: "Marcus Hale", title: "CISO", org: "State agency" })).toBe("Marcus Hale, CISO, State agency");
    expect(personaCardLabel({ name: "Alex Rivera", title: "Director, University of South Florida", org: "University of South Florida" })).toBe(
      "Alex Rivera, Director, University of South Florida",
    );
  });
});

describe("transcriptForDisplay and assignmentForSession", () => {
  const base: SimulationAssignment = {
    id: "a",
    assignedTo: "u",
    assignedBy: "u",
    persona: "Dynamic (AI-generated buyer)",
    vertical: "SLED",
    solutionFocus: "ISC",
    difficulty: "intermediate",
    status: "in_progress",
    transcript: [],
    promptSnapshot: SLED_ROLEPLAY_TEMPLATE,
    startMessage: LEGACY_SIMULATION_START_MESSAGE,
  };
  const stored: SimulationAssignment["transcript"] = [
    { speaker: "persona", message: PIPE_CARD },
    { speaker: "se", message: "Who signs off on this?" },
    { speaker: "persona", message: "Name: not a card, just a reply" },
  ];

  it("cleans only the first persona message", () => {
    const shown = transcriptForDisplay(stored);
    expect(shown[0]!.message).not.toContain("Secret Fear");
    expect(shown.slice(1)).toEqual(stored.slice(1));
  });

  it("shows the buyer's name and title and swaps the legacy opening instruction", () => {
    const session = assignmentForSession(base, stored);
    expect(session.persona).toBe("Marcus Hale, CISO, State agency (SLG)");
    expect(session.transcript[0]!.message).toBe("Marcus Hale: Before we go deep, why should we talk about identity now?");
    expect(session.startMessage).toBe(SIMULATION_START_MESSAGE);
  });

  it("keeps a scenario's own persona and start message", () => {
    const session = assignmentForSession(
      { ...base, persona: "Jordan Hale, IT Director", promptSnapshot: "You are Jordan Hale.", startMessage: "Begin in character." },
      [{ speaker: "persona", message: "Hi, I'm Jordan." }],
    );
    expect(session.persona).toBe("Jordan Hale, IT Director");
    expect(session.startMessage).toBe("Begin in character.");
  });
});

describe("private persona card prompt", () => {
  it("no longer asks the AI to print hidden fields", () => {
    expect(SLED_ROLEPLAY_TEMPLATE).toContain("Print only one line: PERSONA: Name | Title | Org type");
    expect(SLED_ROLEPLAY_TEMPLATE).not.toContain("Output a card with");
    expect(SIMULATION_START_MESSAGE).not.toContain("print the full card");
  });

  it("rewrites the card instruction in templates saved before the change", () => {
    const legacy = SLED_ROLEPLAY_TEMPLATE.replace(
      /Decide privately:[\s\S]*?I have to discover them\.\n/,
      "Output a card with: Name | Title | Org type | Top Priority This Quarter |\nAttitude Toward Vendors | Secret Fear | Opening Move\n",
    );
    expect(legacy).toContain("Output a card with");
    expect(withPrivatePersonaCard(legacy)).toBe(SLED_ROLEPLAY_TEMPLATE);
  });
});
