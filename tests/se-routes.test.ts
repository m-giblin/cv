import { describe, expect, it } from "vitest";
import { canonicalSeHref, legacySeRedirect, LEGACY_SE_REDIRECTS } from "@/lib/se/se-routes";
import { resolveActive } from "@/lib/navigation/nav-model";
import { canAccessRoute } from "@/lib/auth/rbac";
import { flagForPathname } from "@/lib/platform/feature-flags";
import { buildRampModel, splitWeeks, stepLifecycle } from "@/lib/se/ramp-model";
import { buildGateRows, nextGate } from "@/lib/se/gate-matrix";
import { buildCompetencyRows, competencyStatus } from "@/lib/se/competency-table";
import { planStepHref } from "@/lib/utils/plan-links";
import type { CoachingCard, PlanStep, UserPlan } from "@/lib/types";

describe("legacy SE redirects", () => {
  it("maps every legacy path to a new route and keeps the query", () => {
    expect(legacySeRedirect("/simulations", { assignment: "a1", test: "1" })).toBe(
      "/practice/simulations?assignment=a1&test=1",
    );
    expect(legacySeRedirect("/prep", new URLSearchParams("step=s1"))).toBe("/practice/deal-prep?step=s1");
    expect(legacySeRedirect("/market-pulse")).toBe("/practice/quizzes");
    expect(legacySeRedirect("/growth/readiness")).toBe("/readiness");
    expect(legacySeRedirect("/certifications", { profile: "u2" })).toBe("/readiness/certification?profile=u2");
    expect(legacySeRedirect("/lab")).toBe("/learn/lab");
    expect(legacySeRedirect("/resources/")).toBe("/learn");
    expect(legacySeRedirect("/plan-calendar", { view: "x" })).toBe("/my-plan?view=calendar");
    expect(legacySeRedirect("/dashboard")).toBeNull();
    expect(Object.keys(LEGACY_SE_REDIRECTS)).toHaveLength(15);
  });

  it("rewrites hrefs", () => {
    expect(canonicalSeHref("/challenges?focus=challenge")).toBe("/practice/challenges?focus=challenge");
    expect(canonicalSeHref("/manager/inbox")).toBe("/manager/inbox");
  });
});

describe("SE nav model", () => {
  const active = (path: string, query = "") => resolveActive("se", path, new URLSearchParams(query));

  it("lights the right item and tab for new routes", () => {
    // Landing tabs (/practice, /readiness, /learn) share the item's href; resolveActive breaks that tie
    // in favour of the item, so only the item id is asserted for them.
    expect(active("/practice").itemId).toBe("practice");
    expect(active("/readiness").itemId).toBe("readiness");
    expect(active("/practice/simulations")).toEqual({ itemId: "practice", childId: "simulations" });
    expect(active("/readiness/certification")).toEqual({ itemId: "readiness", childId: "certification" });
    expect(active("/learn/lab")).toEqual({ itemId: "learn", childId: "lab" });
    expect(active("/my-plan", "view=calendar").itemId).toBe("ramp");
  });
});

describe("access to new SE routes", () => {
  it("lets every tier open practice, readiness and learn", () => {
    for (const tier of ["se", "manager", "admin"] as const) {
      for (const path of ["/practice", "/practice/simulations", "/readiness", "/readiness/certification", "/learn/lab"]) {
        expect(canAccessRoute(tier, path)).toBe(true);
      }
    }
  });

  it("gates new paths with the same feature flags", () => {
    expect(flagForPathname("/practice/simulations")).toBe("simulations");
    expect(flagForPathname("/practice/quizzes")).toBe("market-pulse");
    expect(flagForPathname("/practice/deal-prep")).toBe("deal-prep");
    expect(flagForPathname("/readiness")).toBe("growth-feedback");
    expect(flagForPathname("/readiness/certification")).toBe("certifications");
    expect(flagForPathname("/readiness/growth-plan")).toBe("development");
    expect(flagForPathname("/learn/lab")).toBe("isc-lab");
    expect(flagForPathname("/learn")).toBe("learn");
  });
});

function step(partial: Partial<PlanStep> & { id: string; order: number }): PlanStep {
  return { title: partial.id, description: "", type: "custom", status: "not_started", ...partial };
}

const plan: UserPlan = {
  id: "p1",
  planTemplateId: "t1",
  userId: "u1",
  mentorId: null,
  name: "Ramp",
  startDate: "2026-09-02",
  targetCompletion: "2026-12-02",
  status: "in_progress",
  progress: 40,
  unlockedSegmentMax: 2,
  steps: [
    step({ id: "a", order: 1, segmentIndex: 1, status: "reviewed" }),
    step({ id: "g1", order: 2, segmentIndex: 1, status: "reviewed", isSegmentGate: true }),
    step({ id: "b", order: 3, segmentIndex: 2, status: "in_progress", type: "challenge", assignmentStepId: "as-b" }),
    step({ id: "g2", order: 4, segmentIndex: 2, isSegmentGate: true }),
    step({ id: "c", order: 5, segmentIndex: 3 }),
  ],
};

describe("ramp model", () => {
  it("splits weeks with the remainder at the end", () => {
    expect(splitWeeks(13, 3)).toEqual([4, 4, 5]);
  });

  it("derives runway, segments and the next step", () => {
    const model = buildRampModel(plan, new Date("2026-10-05T12:00:00Z"));
    expect(model.totalWeeks).toBe(13);
    expect(model.currentWeek).toBe(5);
    expect(model.validated).toBe(2);
    expect(model.nextStep?.id).toBe("b");
    expect(model.nextStepNumber).toBe(3);
    expect(model.segments.map((s) => s.state)).toEqual(["done", "current", "upcoming"]);
    expect(model.segments[0]!.gatePassed).toBe(true);
    expect(model.segments[2]!.locked).toBe(true);
  });

  it("builds the lifecycle row", () => {
    const cells = stepLifecycle({ ...plan.steps[2]!, status: "submitted" }, "Matt");
    expect(cells.map((c) => c.label)).toEqual(["Requested", "Submitted", "With Matt"]);
    expect(cells.map((c) => c.stage)).toEqual(["done", "done", "current"]);
  });

  it("links steps to the new practice routes", () => {
    expect(planStepHref(plan.steps[2]!)).toBe("/practice/challenges?focus=challenge&step=b");
    expect(planStepHref({ ...plan.steps[4]!, assignmentStepId: "as-c" })).toBe("/my-plan?step=as-c");
  });
});

function card(score: number, competencies: string[], at = "2026-10-01T00:00:00Z"): CoachingCard {
  return {
    id: `c-${score}-${competencies.join()}`,
    simulationAssignmentId: "s",
    userId: "u1",
    strengths: [],
    gaps: [],
    recommendedImprovements: [],
    score,
    linkedCompetencies: competencies,
    managerSummary: "",
    seReflection: null,
    managerReviewStatus: "reviewed",
    isPractice: false,
    managerComments: null,
    managerGrade: null,
    sentToManagerAt: at,
    reviewedAt: null,
  };
}

describe("gate matrix", () => {
  it("marks a gate ready when its sims and challenge are met", () => {
    const rows = buildGateRows({
      records: [{ id: "r1", certification_type: "solo_discovery", status: "not_started", evidence_text: null, evidence_url: null, manager_notes: null, approved_at: null }],
      coachingCards: [card(80, ["discovery"]), card(77, ["Discovery"])],
      submissions: [{ id: "x", userId: "u1", challengeId: "ch1", status: "reviewed", reflectionText: "", managerGrade: 4, managerFeedback: null, aiSuggestedScore: null, submittedAt: null, reviewedAt: null }],
      challenges: [{ id: "ch1", title: "", description: "", steps: [], difficulty: "foundational", estimatedMinutes: 10, linkedSolutions: [], linkedResources: [], successCriteria: [], isAiGenerated: false, createdBy: "", competencyNames: ["Discovery"] }],
      userId: "u1",
      reviewerFirstName: "Matt",
    });
    expect(rows[0]!.status).toBe("ready");
    expect(rows[0]!.sims).toEqual({ kind: "stamp", state: "earned", caption: "2 of 2" });
    expect(rows[1]!.status).toBe("locked");
    expect(nextGate(rows)?.type).toBe("solo_discovery");
  });
});

describe("competency table", () => {
  it("scores canonical competencies and flags status", () => {
    const rows = buildCompetencyRows({
      userId: "u1",
      coachingCards: [card(50, ["objection handling"]), card(90, ["discovery"])],
      submissions: [],
      challenges: [],
      now: new Date("2026-10-05T00:00:00Z"),
    });
    // Strongest first (artboard 4a); every row carries a suggested practice.
    expect(rows.map((r) => [r.name, r.score, r.status])).toEqual([
      ["Discovery", 90, "on_track"],
      ["Objection Handling", 50, "needs_practice"],
    ]);
    expect(rows[1]!.suggestion?.href).toBe("/practice/simulations");
    expect(competencyStatus(65)).toBe("close");
  });
});
