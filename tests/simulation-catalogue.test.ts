import { describe, expect, it } from "vitest";
import { buildSimulationCatalogue, scenarioKind, type CatalogueTemplate } from "@/lib/simulations/catalogue";
import { SLED_ROLEPLAY_TEMPLATE } from "@/lib/simulations/prompt-template";
import type { SimulationAssignment } from "@/lib/types";

const templates: CatalogueTemplate[] = [
  { id: "rough", name: "SLED Rough — Budget Frozen Surprise", persona: "Dynamic (AI-generated buyer)", vertical: "SLED", difficulty: "advanced", kind: "Roleplay", competency: null },
  { id: "drill", name: "Identity Graph: objection drill", persona: "SLED buyer (objection practice)", vertical: "SLED", difficulty: "intermediate", kind: "Objection drill", competency: null },
  { id: "jml", name: "Foundation: Joiner, mover, and leaver", persona: "Jordan Hale, IT Director at a state university", vertical: "Higher Ed", difficulty: "foundational", kind: "Scenario", competency: "Identity foundations" },
  { id: "disc", name: "Discovery-Only — No Demo Allowed", persona: "Dynamic (AI-generated buyer)", vertical: "SLED", difficulty: "foundational", kind: "Roleplay", competency: null },
];

function sim(partial: Partial<SimulationAssignment>): SimulationAssignment {
  return {
    id: "s",
    assignedTo: "steve",
    assignedBy: "steve",
    persona: "Buyer",
    vertical: "SLED",
    solutionFocus: "ISC",
    difficulty: "intermediate",
    status: "not_started",
    transcript: [],
    ...partial,
  };
}

describe("buildSimulationCatalogue", () => {
  it("gives a week-1 hire their ramp steps and foundational scenarios first", () => {
    const catalogue = buildSimulationCatalogue({
      userId: "steve",
      simulations: [],
      templates,
      rampSteps: [
        { stepId: "s17", title: "Foundation: People and non-human accounts", templateId: null, sortOrder: 17, status: "not_started", dueDate: "2026-11-22" },
        { stepId: "s9", title: "Foundation: Joiner, mover, and leaver", templateId: "jml", sortOrder: 9, status: "not_started", dueDate: "2026-11-08" },
      ],
    });
    expect(catalogue.ramp.map((entry) => entry.title)).toEqual([
      "Foundation: Joiner, mover, and leaver",
      "Foundation: People and non-human accounts",
    ]);
    expect(catalogue.ramp[0]).toMatchObject({ href: "/practice/simulations?step=s9&template=jml", dueDate: "2026-11-08", status: "Not started" });
    expect(catalogue.ramp[1]!.href).toBe("/practice/simulations?step=s17");
    expect(catalogue.assigned).toEqual([]);
    expect(catalogue.inProgress).toEqual([]);
    expect(catalogue.browse.map((group) => group.difficulty)).toEqual(["foundational", "intermediate", "advanced"]);
    expect(catalogue.browse[0]!.entries.map((entry) => entry.title)).toEqual([
      "Foundation: Joiner, mover, and leaver",
      "Discovery-Only — No Demo Allowed",
    ]);
    expect(catalogue.browse[0]!.entries[1]!.detail).toBe("AI-generated buyer, SLED");
  });

  it("splits assigned work from practice the person started, without repeating ramp steps", () => {
    const catalogue = buildSimulationCatalogue({
      userId: "steve",
      simulations: [
        sim({ id: "from-mgr", assignedBy: "kathy", templateId: "drill", status: "in_progress" }),
        sim({ id: "ramp-run", templateId: "jml", status: "in_progress" }),
        sim({ id: "own", templateId: "rough" }),
        sim({ id: "done", templateId: "disc", status: "completed" }),
        sim({ id: "someone-else", assignedTo: "kathy", templateId: "disc" }),
      ],
      templates,
      rampSteps: [{ stepId: "s9", title: "Foundation: Joiner, mover, and leaver", templateId: "jml", sortOrder: 9, status: "not_started", dueDate: null }],
      assignerNames: { kathy: "Kathy" },
      testMode: true,
    });
    expect(catalogue.ramp[0]!.status).toBe("In progress");
    expect(catalogue.assigned).toEqual([
      expect.objectContaining({ title: "Identity Graph: objection drill", detail: "Assigned by Kathy", href: "/practice/simulations?assignment=from-mgr&test=1", status: "In progress" }),
    ]);
    expect(catalogue.inProgress.map((entry) => entry.key)).toEqual(["sim-own"]);
  });
});

describe("scenarioKind", () => {
  it("tells roleplays, scenarios, pitches and drills apart", () => {
    expect(scenarioKind({ name: "SLED Sales Roleplay", persona: "Dynamic", promptBody: SLED_ROLEPLAY_TEMPLATE })).toBe("Roleplay");
    expect(scenarioKind({ name: "Foundation: JML", persona: "Jordan Hale", promptBody: "You are Jordan Hale." })).toBe("Scenario");
    expect(scenarioKind({ name: "Elevator Pitch — FED", persona: "James", promptBody: "PART 1 — IN CHARACTER" })).toBe("Elevator pitch");
    expect(scenarioKind({ name: "Identity Graph: objection drill", persona: "SLED buyer (objection practice)", promptBody: "" })).toBe("Objection drill");
  });
});
