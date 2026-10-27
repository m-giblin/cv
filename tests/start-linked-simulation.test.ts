import { describe, expect, it } from "vitest";
import { buildSimScoringBlock, joinSimPrompt } from "@/lib/admin/practice-library";
import { scenarioFromScoring } from "@/lib/simulations/session-rubric";
import { SCENARIO_START_MESSAGE, resolveSimulationStartMessage } from "@/lib/simulations/prompt-template";
import { reusableAssignmentId } from "@/lib/simulations/start-linked-simulation";
import { resolveSimulationAssignment } from "@/lib/simulations/resolve-assignment";
import type { SimulationAssignment } from "@/lib/types";

function assignment(partial: Partial<SimulationAssignment>): SimulationAssignment {
  return {
    id: "a",
    assignedTo: "user",
    assignedBy: "user",
    persona: "Buyer",
    vertical: "SLED",
    solutionFocus: "Atlas",
    difficulty: "intermediate",
    status: "not_started",
    transcript: [],
    ...partial,
  };
}

describe("reusableAssignmentId", () => {
  it("prefers the in-progress run of the linked template", () => {
    const id = reusableAssignmentId(
      [
        assignment({ id: "other", templateId: "sled", status: "in_progress" }),
        assignment({ id: "fresh", templateId: "jml", status: "not_started" }),
        assignment({ id: "open", templateId: "jml", status: "in_progress" }),
      ],
      "user",
      "jml",
    );
    expect(id).toBe("open");
  });

  it("ignores a different person's assignment and a finished run", () => {
    expect(
      reusableAssignmentId(
        [
          assignment({ id: "theirs", assignedTo: "other", templateId: "jml", status: "in_progress" }),
          assignment({ id: "done", templateId: "jml", status: "submitted" }),
        ],
        "user",
        "jml",
      ),
    ).toBeNull();
  });
});

describe("scenario start", () => {
  it("opens a written scenario in character", () => {
    const prompt = joinSimPrompt(
      "You are Jordan Hale.\nSituation: Access looks fine until someone changes departments.",
      buildSimScoringBlock({
        goals: ["Explain joining in plain language"],
        passMark: 70,
        rounds: 1,
        competency: "Identity foundations",
      }),
    );
    expect(resolveSimulationStartMessage("Foundation: Joiner, mover, and leaver", prompt)).toBe(SCENARIO_START_MESSAGE);
    const brief = scenarioFromScoring(prompt, "Jordan Hale");
    expect(brief?.context).toContain("changes departments");
    expect(brief?.criteria.map((item) => item.label)).toEqual(["Explain joining in plain language"]);
    expect(brief?.objective).toContain("70");
  });
});

describe("resolveSimulationAssignment", () => {
  it("opens the named assignment and refuses a different one", () => {
    const simulations = [
      assignment({ id: "first", persona: "First buyer" }),
      assignment({ id: "second", persona: "Second buyer" }),
    ];
    expect(resolveSimulationAssignment(simulations, "user", "second").assignment?.persona).toBe("Second buyer");
    expect(resolveSimulationAssignment(simulations, "user", "missing").assignment).toBeNull();
  });

  it("keeps the default opening when no assignment is named", () => {
    const simulations = [assignment({ id: "first" })];
    expect(resolveSimulationAssignment(simulations, "user").assignment?.id).toBe("first");
    expect(resolveSimulationAssignment([], "user").assignment?.id).toBe("practice-local");
  });
});
