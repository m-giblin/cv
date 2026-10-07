import { describe, expect, it } from "vitest";
import { normaliseLines, parseFieldGuide, slugify, unquote } from "@/lib/playbooks/parse-field-guide";
import { playbookBodySchema } from "@/lib/playbooks/types";

// A miniature guide in the same template as the real one (one paragraph per line, as mammoth emits it).
const GUIDE = `
SAILPOINT IDENTITY SECURITY CLOUD
Sales Enablement Field Guide
For Account Executives
State, Local & Higher Education (SLED)
Edition 9.1
Contents
Chapter 1 — Widget Platform\t3
CHAPTER 0
How to Use This Book
Read the chapters in order.
Which Chapter Do I Read for This Deal?
CH
Capability
Lead with this when...
1
Widget Platform
Any first conversation
2
Gadget Graph
They had an incident
Two Rules for Using This Material
Never lead with the product.
Foreword: Why It Works
Teach, tailor, take control.
CHAPTER 1
Widget Platform
The foundation
What You Will Be Able to Do After This Chapter
•\tExplain the platform.
Chapter Preview
Widgets are the base.
Where this fits: First conversations.
The Problem: Gaps Between Tools
Seams leak policy.
What This Costs a SLED Organization
State & Local An agency could not answer an auditor.
Higher Education A university lost its integration expert.
The Solution: Five Pillars
Each pillar matters.
Pillar 1 — One Data Model
One place to answer who has access.
Selling Motion: The Challenger Framework
Teach "Seams are the risk."
Tailor "Your audits need proof."
Take Control "One engine, not five tools."
30-Second Elevator Pitch
Deliver This Without Notes
"Widgets govern every identity."
Discovery Questions
Use these before introducing the solution. The goal is to get the prospect to describe the problem in their own words.
"How many tools grant access today?"
Buying Triggers
This capability is in play when you see any of the following:
A legacy contract is up for renewal.
Storytelling: Bringing It to Life
State & Local Story A DOT had 14 domains.
Higher Education Story A college replaced scripts.
Objection Handling
Objection: "We already have a tool."
Your response: "What share of apps does it cover?"
Common Mistakes — What Not to Do
Avoid These
Leading with the architecture.
Lead with the gap instead.
Chapter Summary
Key Takeaways
Widgets are the architecture.
Retrieval Check — Test Yourself Before Moving On
Answer these without looking back. If you cannot, re-read the section noted.
1. Name the pillars.
CHAPTER 2
Gadget Graph
Blast radius
The 90-Second Hook — Open Cold With This
"How many gadgets are running?"
Wait. Let them answer.
Elevator Pitches
Pitch 1 — The Shadow Problem
"You have more gadgets than you think."
Pitch 2 — The Debt Problem
"Every integration leaves a gadget behind."
Discovery Questions
"Who owns your gadgets?"
Objection Handling
Objection: "We have a policy."
Your response: "Policies tell people what not to do."
Chapter Summary
Gadgets hide.
Part Two
THE NEW FRONTIER
Nothing competes with this.
Appendix
FAST TRACK
Fast Track Cards
CH 1   Widget Platform
The Pitch
"Widgets govern every identity."
Ask These
"How many tools grant access today?" (Most cannot answer.)
Top Objection
"We already have a tool."
"What share of apps does it cover?"
`;

describe("field guide parser", () => {
  const guide = parseFieldGuide(GUIDE);

  it("reads the front page", () => {
    expect(guide.title).toBe("Sales Enablement Field Guide");
    expect(guide.segment).toBe("sled");
    expect(guide.edition).toBe("9.1");
    expect(guide.body.audience).toBe("For Account Executives");
  });

  it("reads the routing table and guide sections", () => {
    expect(guide.body.routing).toEqual([
      { chapter: 1, capability: "Widget Platform", leadWhen: "Any first conversation" },
      { chapter: 2, capability: "Gadget Graph", leadWhen: "They had an incident" },
    ]);
    expect(guide.body.sections.map((section) => section.title)).toEqual([
      "How to Use This Book",
      "Foreword: Why It Works",
      "Part Two: The New Frontier",
    ]);
    expect(guide.body.sections[0]!.paragraphs).not.toContain("Lead with this when...");
  });

  it("parses every part of a standard chapter", () => {
    const one = guide.playbooks[0]!;
    expect(one).toMatchObject({ chapter: 1, slug: "widget-platform", title: "Widget Platform" });
    const body = one.body;
    expect(body.subtitle).toBe("The foundation");
    expect(body.objectives).toEqual(["Explain the platform."]);
    expect(body.whereFits).toBe("First conversations.");
    expect(body.problem).toEqual({ title: "Gaps Between Tools", paragraphs: ["Seams leak policy."] });
    expect(body.costs.map((cost) => cost.segment)).toEqual(["state_local", "higher_ed"]);
    expect(body.solution.parts).toEqual([{ title: "Pillar 1 — One Data Model", paragraphs: ["One place to answer who has access."] }]);
    expect(body.motion).toEqual({ teach: "Seams are the risk.", tailor: "Your audits need proof.", takeControl: "One engine, not five tools." });
    expect(body.pitches).toEqual([{ title: "Elevator pitch", text: "Widgets govern every identity." }]);
    expect(body.discoveryQuestions).toEqual(["How many tools grant access today?"]);
    expect(body.buyingTriggers).toEqual(["A legacy contract is up for renewal."]);
    expect(body.stories).toEqual([
      { segment: "state_local", text: "A DOT had 14 domains." },
      { segment: "higher_ed", text: "A college replaced scripts." },
    ]);
    expect(body.objections).toEqual([{ objection: "We already have a tool.", response: "What share of apps does it cover?" }]);
    expect(body.mistakes).toEqual([{ title: "Leading with the architecture.", body: "Lead with the gap instead." }]);
    expect(body.takeaways).toEqual(["Widgets are the architecture."]);
    expect(body.retrievalCheck).toEqual(["Name the pillars."]);
    expect(body.fastTrack).toEqual({
      pitch: "Widgets govern every identity.",
      questions: ["How many tools grant access today?"],
      objection: "We already have a tool.",
      response: "What share of apps does it cover?",
    });
    expect(playbookBodySchema.parse(body)).toEqual(body);
  });

  it("handles hooks, multiple named pitches and missing sections", () => {
    const two = guide.playbooks[1]!.body;
    expect(two.hook).toEqual(['"How many gadgets are running?"', "Wait. Let them answer."]);
    expect(two.pitches.map((pitch) => pitch.title)).toEqual(["The Shadow Problem", "The Debt Problem"]);
    expect(two.pitches[1]!.text).toBe("Every integration leaves a gadget behind.");
    expect(guide.warnings).toContain("Chapter 2 (Gadget Graph): no Fast Track card found.");
  });

  it("keeps chapters independent", () => {
    expect(guide.playbooks[1]!.body.solution.parts).toEqual([]);
    expect(guide.playbooks[1]!.body.objections).toHaveLength(1);
  });

  it("reports a document with no chapters", () => {
    expect(parseFieldGuide("Just some notes").warnings[0]).toMatch(/No chapters found/);
  });
});

describe("parser helpers", () => {
  it("cleans bullets, quotes and slugs", () => {
    expect(normaliseLines("•\tFirst\n\n  Second  line ")).toEqual(["First", "Second line"]);
    expect(unquote("“Hello”")).toBe("Hello");
    expect(slugify("Certifications & AIC")).toBe("certifications-and-aic");
  });
});
