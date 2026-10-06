import { describe, expect, it } from "vitest";
import {
  ADMIN_ROUTES,
  LEGACY_ADMIN_PATHS,
  adminPathFor,
  adminRouteFromPath,
  canonicalAdminHref,
} from "@/lib/admin/admin-routes";
import { emptyBuilderStep, gateNumbers, planChecklist, segmentWeeksLabel } from "@/lib/admin/plan-builder";
import {
  DEFAULT_PRACTICE_FILTERS,
  filterPractice,
  formatShortDate,
  parseSimPrompt,
  pitchToItem,
  practiceStatusCounts,
  simToItem,
  sortPractice,
  type PitchScenarioRow,
  type SimTemplateRow,
} from "@/lib/admin/practice-library";
import {
  applyPreset,
  applyUpload,
  canPublish,
  canReach,
  duplicateFromPitch,
  duplicateFromSim,
  effectiveOverrides,
  initialWizardState,
  parsePitchGoals,
  publishChecklist,
  rubric,
  slugify,
  stepHint,
  stepValid,
  toPitchPayload,
  toSimPayload,
  type WizardState,
} from "@/lib/admin/practice-wizard";
import { NAV } from "@/lib/navigation/nav-model";

const filledSim = (): WizardState => ({
  ...initialWizardState(),
  step: 4,
  name: "Healthcare CISO, breach follow-up",
  situation: "A contractor account was used after the contract ended.",
  goals: ["How contractor access is granted", "Time from contract end to removal"],
  pass: "75",
  competency: "Discovery",
});

describe("practice routes", () => {
  it("serves Content › Practice at its own path", () => {
    expect(adminRouteFromPath("/admin/content/practice")).toEqual({ path: "/admin/content/practice", tab: "practice" });
    expect(adminPathFor("practice")).toBe("/admin/content/practice");
  });

  it("keeps the retired AI & sims URLs working", () => {
    expect(LEGACY_ADMIN_PATHS["/admin/content/ai"]).toBe("/admin/content/practice");
    expect(adminRouteFromPath("/admin/content/ai")?.tab).toBe("practice");
    expect(adminPathFor("ai")).toBe("/admin/content/practice");
    expect(canonicalAdminHref("/admin?tab=ai")).toBe("/admin/content/practice");
    expect(ADMIN_ROUTES.some((route) => route.path === "/admin/content/ai")).toBe(false);
  });

  it("lists Content children as Library, Practice, Corpus, Reviews", () => {
    const content = NAV.tenant_admin.find((item) => item.id === "content");
    expect(content?.children?.map((child) => child.label)).toEqual(["Library", "Practice", "Corpus", "Reviews"]);
    expect(content?.children?.find((child) => child.id === "practice")?.href).toBe("/admin/content/practice");
  });
});

describe("practice wizard validation", () => {
  it("lets Start through and needs a name and role for a named persona", () => {
    const state = initialWizardState();
    expect(stepValid(state, 1)).toBe(true);
    expect(stepValid(state, 2)).toBe(true);
    const named = { ...state, persona: "named" as const };
    expect(stepValid(named, 2)).toBe(false);
    expect(stepHint(named, 2)).toBe("Add a name and role for the persona.");
    expect(stepValid({ ...named, personaName: "Marcus Reid", personaRole: "CIO, State of Ohio" }, 2)).toBe(true);
    expect(stepValid({ ...named, kind: "pitch" }, 2)).toBe(true);
  });

  it("needs a name, a situation and two goals in step 3", () => {
    const state = initialWizardState();
    expect(stepHint(state, 3)).toBe("Add a name, a situation, and 2 goals.");
    const partial = { ...state, name: "SLED roleplay", situation: "A state agency after an audit.", goals: ["Find the finding", ""] };
    expect(stepHint(partial, 3)).toBe("Add 1 more goal.");
    expect(stepValid({ ...partial, goals: ["Find the finding", "Map approvers"] }, 3)).toBe(true);
  });

  it("needs a pass mark and a competency in step 4", () => {
    const state = { ...filledSim(), pass: null, competency: null };
    expect(stepHint(state, 4)).toBe("Pick a pass mark and a competency.");
    expect(stepHint({ ...state, pass: "70" }, 4)).toBe("Pick a competency.");
    expect(canPublish(filledSim())).toBe(true);
  });

  it("only opens later steps once the earlier ones are valid", () => {
    const state = { ...initialWizardState(), step: 1 as const };
    expect(canReach(state, 2)).toBe(true);
    expect(canReach(state, 4)).toBe(false);
    expect(canReach({ ...filledSim(), step: 2 }, 4)).toBe(true);
  });

  it("builds the checklist and an equal-weight rubric", () => {
    const checks = publishChecklist(filledSim());
    expect(checks.every((row) => row.done)).toBe(true);
    expect(checks[3]!.label).toBe("2 of 2 to 4 goals");
    expect(rubric(filledSim()).map((row) => row.weight)).toEqual(["50%", "50%"]);
  });
});

describe("practice wizard starts", () => {
  it("fills the presets", () => {
    const sled = applyPreset(initialWizardState(), "sled");
    expect(sled.kind).toBe("sim");
    expect(sled.goals).toHaveLength(3);
    const elevator = applyPreset(initialWizardState(), "elevator");
    expect(elevator.kind).toBe("pitch");
    expect(elevator.duration).toBe(60);
    expect(applyPreset(sled, "blank").name).toBe("");
  });

  it("fills the scenario from an uploaded file", () => {
    const state = applyUpload(initialWizardState(), "ciso-breach.md", "A health system had a breach.\n\nMore detail.");
    expect(state.name).toBe("Ciso breach");
    expect(state.situation).toBe("A health system had a breach.");
    expect(state.rawScenario).toContain("More detail.");
  });

  it("only lets difficulty vary when the prompt is parameterised", () => {
    expect(effectiveOverrides({ solution: false, vertical: false, difficulty: true }).difficulty).toBe(false);
    expect(effectiveOverrides({ solution: true, vertical: false, difficulty: true }).difficulty).toBe(true);
  });
});

describe("practice wizard data mapping", () => {
  it("maps a simulation to the simulation template API and round-trips its scoring", () => {
    const payload = toSimPayload(filledSim());
    expect(payload).toMatchObject({
      name: "Healthcare CISO, breach follow-up",
      persona: "Dynamic (AI-generated buyer)",
      vertical: "Healthcare",
      difficulty: "intermediate",
      practiceRoundsBeforeSubmit: 1,
    });
    expect(payload.promptBody).toContain("{{solution}}");
    expect(payload.promptBody).toContain("{{vertical}}");
    const parsed = parseSimPrompt(payload.promptBody);
    expect(parsed).toMatchObject({ passMark: 75, rounds: 1, competency: "Discovery" });
    expect(parsed.goals).toEqual(["How contractor access is granted", "Time from contract end to removal"]);
  });

  it("duplicates a wizard-written simulation", () => {
    const row: SimTemplateRow = {
      id: "s1",
      name: "Healthcare CISO",
      persona: "Dynamic (AI-generated buyer)",
      vertical: "Healthcare",
      solutionFocus: "ISC",
      difficulty: "advanced",
      promptBody: toSimPayload(filledSim()).promptBody,
      practiceRoundsBeforeSubmit: 2,
      parameterized: true,
      hasSolutionPlaceholder: true,
      updatedAt: "2026-09-28T10:00:00Z",
    };
    const state = duplicateFromSim(initialWizardState(), row, "sim-s1");
    expect(state.name).toBe("Healthcare CISO (copy)");
    expect(state.situation).toBe("A contractor account was used after the contract ended.");
    expect(state.difficulty).toBe("Advanced");
    expect(state.pass).toBe("75");
    expect(state.rawScenario).toBeNull();
  });

  it("maps a pitch to the pitch scenario API with derived fields", () => {
    const state: WizardState = {
      ...filledSim(),
      kind: "pitch",
      track: "Competitive",
      duration: 120,
      name: "Competitive: legacy IGA",
      pass: "4",
    };
    const payload = toPitchPayload(state, { active: true, suffix: "abc" });
    expect(payload).toMatchObject({
      slug: "competitive-legacy-iga-abc",
      track: "competitive",
      label: "Competitive: legacy IGA",
      promptLabel: "Competitive pitch",
      maxDurationSec: 120,
      passingGrade: 4,
      competencies: ["Discovery"],
      active: true,
    });
    expect(parsePitchGoals(payload.description)).toEqual(state.goals);
    expect(toPitchPayload(state, { active: false }).active).toBe(false);
    const copy = duplicateFromPitch(initialWizardState(), { ...payload, id: "p9", sortOrder: 0, linkedSolution: null }, "pitch-p9");
    expect(copy).toMatchObject({ kind: "pitch", track: "Competitive", duration: 120, pass: "4", competency: "Discovery" });
    expect(copy.goals).toEqual(state.goals);
  });

  it("slugifies names", () => {
    expect(slugify("Elevator pitch: identity security!")).toBe("elevator-pitch-identity-security");
  });
});

describe("practice library", () => {
  const sim: SimTemplateRow = {
    id: "s1",
    name: "SLED sales roleplay",
    persona: "Dynamic (AI-generated buyer)",
    vertical: "SLED",
    solutionFocus: "ISC",
    difficulty: "intermediate",
    promptBody: toSimPayload(filledSim()).promptBody,
    practiceRoundsBeforeSubmit: 1,
    parameterized: true,
    hasSolutionPlaceholder: true,
    updatedAt: "2026-09-28T10:00:00Z",
  };
  const pitch: PitchScenarioRow = {
    id: "p1",
    slug: "competitive",
    track: "competitive",
    shortLabel: "Competitive",
    label: "Competitive: legacy IGA",
    promptLabel: "Competitive pitch",
    prompt: "The buyer says their IGA tool works fine.",
    description: "",
    competencies: [],
    linkedSolution: null,
    maxDurationSec: 90,
    sortOrder: 0,
    active: false,
    passingGrade: 4,
  };
  const usage = { simPlans: { s1: 2 }, simRuns30d: { s1: 66 }, pitchSlots: {}, pitchRuns30d: {} };
  const items = [simToItem(sim, usage), pitchToItem(pitch, usage)];

  it("merges both APIs into one list", () => {
    expect(items[0]).toMatchObject({ subline: "Dynamic buyer, SLED, intermediate", usedIn: "2 plans", runs30d: 66, status: "live" });
    expect(items[0]!.competencies).toEqual(["Discovery"]);
    expect(items[1]).toMatchObject({ usedIn: "None yet", status: "draft", warning: "Missing a coaching description" });
  });

  it("filters and counts", () => {
    expect(practiceStatusCounts(items)).toEqual({ all: 2, live: 1, draft: 1 });
    expect(filterPractice(items, { ...DEFAULT_PRACTICE_FILTERS, show: "draft" })).toHaveLength(1);
    expect(filterPractice(items, { ...DEFAULT_PRACTICE_FILTERS, type: "sim", competency: "Discovery" })).toHaveLength(1);
    expect(sortPractice(items, "used")[0]!.kind).toBe("sim");
  });

  it("formats dates like Thu, Oct 9", () => {
    expect(formatShortDate("2026-10-09", new Date("2026-10-05T12:00:00"))).toBe("Fri, Oct 9");
    expect(formatShortDate("2025-10-09", new Date("2026-10-05T12:00:00"))).toBe("Thu, Oct 9, 2025");
    expect(formatShortDate(null)).toBe("Not recorded");
  });
});

describe("plan builder checklist", () => {
  const step = (partial = {}) =>
    emptyBuilderStep({
      title: "Entra ID connector challenge",
      stepType: "challenge",
      criteria: ["Source connected"],
      evidence: "recording",
      reviewer: "manager",
      segmentIndex: 1,
      ...partial,
    });

  it("names the steps that block publishing and flags segments without a gate", () => {
    const steps = [step(), step({ reviewer: "" }), step({ isSegmentGate: true })];
    const rows = planChecklist(steps);
    expect(rows.find((row) => row.id === "reviewer")).toMatchObject({ done: false, label: "Every step has a reviewer (step 02)" });
    expect(rows.find((row) => row.id === "gates")?.done).toBe(true);
    expect(planChecklist([step()]).find((row) => row.id === "gates")).toMatchObject({ done: false, blocking: false });
    expect([...gateNumbers(steps).values()]).toEqual([1]);
  });

  it("labels segment weeks in words", () => {
    expect(segmentWeeksLabel({ startWeek: 1, endWeek: 4 })).toBe("weeks 1 to 4");
    expect(segmentWeeksLabel({ startWeek: 5, endWeek: 5 })).toBe("week 5");
  });
});
