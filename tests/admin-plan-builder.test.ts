import { describe, expect, it } from "vitest";
import { adminPathFor, adminRouteFromPath, canonicalAdminHref } from "@/lib/admin/admin-routes";
import { changedFeatureIds, planLockedFeatureIds, toggleFeature } from "@/lib/admin/feature-settings";
import {
  builderStepsToPayload,
  canPublish,
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
