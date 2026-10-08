import { describe, expect, it } from "vitest";
import { createTemplateSchema, templateStepSchema } from "@/lib/plans/template-step-schema";
import { adminPathFor, adminRouteFromPath, canonicalAdminHref } from "@/lib/admin/admin-routes";
import { changedFeatureIds, planLockedFeatureIds, toggleFeature } from "@/lib/admin/feature-settings";
import {
  builderStepsToPayload,
  canPublish,
  catalogStepReady,
  challengeStepPatch,
  knowledgeCheckStepPatch,
  persistedStepType,
  playbookStepPatch,
  simulationStepPatch,
  dayOf,
  dbStepToBuilder,
  emptyBuilderStep,
  layoutGrid,
  minutesPerWeek,
  offsetFor,
  outlineGroups,
  segmentRangeLabel,
  stepIssues,
  weekOf,
} from "@/lib/admin/plan-builder";
import { builderMetadata } from "@/lib/plans/builder-metadata";
import { defaultFeatureFlags } from "@/lib/platform/settings-shared";

const complete = (partial = {}) =>
  emptyBuilderStep({
    title: "Entra ID connector challenge",
    stepType: "challenge",
    criteria: ["Source connected"],
    evidence: "recording",
    reviewer: "manager",
    ...partial,
  });

describe("admin assign route", () => {
  it("maps /admin/programs/assign both ways", () => {
    expect(adminRouteFromPath("/admin/programs/assign")).toEqual({ path: "/admin/programs/assign", tab: "assign" });
    expect(adminPathFor("assign")).toBe("/admin/programs/assign");
    expect(canonicalAdminHref("/admin?tab=assign")).toBe("/admin/programs/assign");
  });
});

describe("plan builder publish rule", () => {
  it("flags every missing required field", () => {
    expect(stepIssues(emptyBuilderStep())).toEqual(["type", "title", "criteria", "evidence", "reviewer"]);
    expect(stepIssues(complete())).toEqual([]);
    expect(stepIssues(complete({ criteria: ["  ", ""] }))).toEqual(["criteria"]);
  });

  it("fills a simulation step from the live scenario", () => {
    const patch = simulationStepPatch({
      id: "sim-1",
      name: "Foundation: Joiner, mover, and leaver",
      persona: "Jordan Hale, IT Director",
      goals: ["Explain joining in plain language", "Ask what tells IT about a transfer"],
      passMark: 70,
      competency: "Identity foundations",
    });
    const step = emptyBuilderStep({ ...patch, segmentIndex: 1 });
    expect(step.title).toBe("Foundation: Joiner, mover, and leaver");
    expect(step.criteria).toEqual(["Explain joining in plain language", "Ask what tells IT about a transfer"]);
    expect(step.evidence).toBe("score");
    expect(step.reviewer).toBe("auto");
    expect(step.competency).toBe("Identity foundations");
    expect(catalogStepReady(emptyBuilderStep({ stepType: "simulation" }))).toBe(false);
    expect(catalogStepReady(step)).toBe(true);
    expect(stepIssues(step)).toEqual([]);
  });

  it("fills a playbook step from a published chapter", () => {
    const step = emptyBuilderStep(
      playbookStepPatch({ id: "11111111-1111-4111-8111-111111111111", title: "Identity lifecycle", chapter: 2, slug: "identity-lifecycle" }),
    );
    expect(step.stepType).toBe("playbook");
    expect(step.title).toBe("Chapter 2: Identity lifecycle");
    expect(step.playbookSlug).toBe("identity-lifecycle");
    expect(persistedStepType("playbook")).toBe("content_review");
    expect(stepIssues(step)).toEqual([]);
    expect(catalogStepReady(emptyBuilderStep({ stepType: "playbook" }))).toBe(false);
  });

  it("accepts null playbook ids on steps the builder publishes", () => {
    const step = builderStepsToPayload([
      emptyBuilderStep({
        stepType: "simulation",
        title: "Foundation: Joiner, mover, and leaver",
        simulationTemplateId: "811178bf-24a8-46c3-8437-d9eff3541a56",
      }),
    ])[0];
    expect(step?.playbookId).toBeNull();
    expect(step?.playbookSlug).toBeNull();
    expect(templateStepSchema.safeParse(step).success).toBe(true);
    const created = createTemplateSchema.safeParse({
      name: "New Hirer - Foundation",
      steps: [step],
    });
    expect(created.success).toBe(true);
  });

  it("fills a knowledge check from the question bank", () => {
    const step = emptyBuilderStep(knowledgeCheckStepPatch({ key: "atlas", title: "Atlas foundations" }, 80));
    expect(step.title).toBe("Atlas foundations");
    expect(step.questionSource).toBe("atlas");
    expect(step.passScore).toBe(80);
    expect(stepIssues(step)).toEqual([]);
  });

  it("fills a challenge step from the challenge title", () => {
    const step = emptyBuilderStep(challengeStepPatch({ id: "c1", title: "Connect Entra ID", estimated_minutes: 25 }));
    expect(step.title).toBe("Connect Entra ID");
    expect(step.challengeId).toBe("c1");
    expect(step.estimatedMinutes).toBe(25);
    expect(stepIssues(step)).toEqual([]);
  });

  it("blocks publish while any step is incomplete", () => {
    expect(canPublish("Basic SE ramp", [complete()])).toBe(true);
    expect(canPublish("Basic SE ramp", [complete(), complete({ reviewer: "" })])).toBe(false);
    expect(canPublish("Ba", [complete()])).toBe(false);
    expect(canPublish("Basic SE ramp", [])).toBe(false);
  });

  it("round-trips builder fields through step metadata", () => {
    const [payload] = builderStepsToPayload([complete({ criteria: [" A ", ""], competency: "Demo execution" })]);
    const metadata = { dueOffsetDays: payload!.dueOffsetDays, ...builderMetadata(payload!) };
    const step = dbStepToBuilder({
      id: "s1",
      title: payload!.title,
      description: null,
      step_type: payload!.stepType,
      sort_order: 1,
      content_url: null,
      content_asset_id: null,
      challenge_id: null,
      simulation_template_id: null,
      metadata,
    });
    expect(step.criteria).toEqual(["A"]);
    expect(step.evidence).toBe("recording");
    expect(step.reviewer).toBe("manager");
    expect(step.competency).toBe("Demo execution");
  });
});

describe("plan builder weeks", () => {
  it("converts between offsets and week/day", () => {
    expect(weekOf(32)).toBe(5);
    expect(dayOf(32)).toBe(4);
    expect(offsetFor(5, 4)).toBe(32);
  });

  it("derives segment week spans", () => {
    const groups = outlineGroups([
      complete({ segmentIndex: 1, dueOffsetDays: 26 }),
      complete({ segmentIndex: 2, dueOffsetDays: 54 }),
      complete({ segmentIndex: 3, dueOffsetDays: 70 }),
    ]);
    expect(groups.map(segmentRangeLabel)).toEqual([
      "W01–04 · FOUNDATIONS",
      "W05–08 · FIELD SKILLS",
      "W09–13 · ADVISORY READINESS",
    ]);
  });

  it("packs blocks into rows without overlap", () => {
    const { blocks, rows } = layoutGrid([
      complete({ dueOffsetDays: 14 }),
      complete({ dueOffsetDays: 14 }),
      complete({ dueOffsetDays: 28 }),
    ]);
    expect(blocks.map((block) => [block.startWeek, block.endWeek, block.row])).toEqual([
      [1, 2, 0],
      [2, 2, 1],
      [3, 4, 0],
    ]);
    expect(rows).toBe(2);
  });

  it("sums minutes per due week", () => {
    const weeks = minutesPerWeek(
      [complete({ dueOffsetDays: 3, estimatedMinutes: 90 }), complete({ dueOffsetDays: 5, estimatedMinutes: 30 })],
      (step) => step.estimatedMinutes,
    );
    expect(weeks[0]).toBe(120);
    expect(weeks[1]).toBeNull();
  });
});

describe("tenant feature settings", () => {
  it("locks features the platform plan switches off, plus the admin console", () => {
    expect(planLockedFeatureIds("enterprise")).toEqual(["tenant-admin-console"]);
    expect(planLockedFeatureIds("manager-lite")).toContain("assign-plans");
    expect(planLockedFeatureIds(null)).toEqual(["tenant-admin-console"]);
  });

  it("refuses toggles that cascade into locked features", () => {
    const flags = { ...defaultFeatureFlags(), "ai-features": false, simulations: false };
    expect(toggleFeature(flags, "simulations", true, ["ai-features"])).toBeNull();
    const next = toggleFeature(flags, "simulations", true, []);
    expect(next?.["ai-features"]).toBe(true);
    expect(changedFeatureIds(flags, next!)).toEqual(expect.arrayContaining(["simulations", "ai-features"]));
  });
});
