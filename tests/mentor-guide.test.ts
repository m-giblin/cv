import { describe, expect, it } from "vitest";
import { mentorGuideFor, mentorPreviewHref, resourceKeyForStep, stepExemplar } from "@/lib/mentoring/mentor-guide";
import type { PlanStep } from "@/lib/types";

const PLAYBOOK_ID = "23763421-ecbd-4625-bb2f-ed0a31b5f6c5";

function step(patch: Partial<PlanStep>): PlanStep {
  return { id: "s1", title: "Step", description: "", type: "custom", order: 1, status: "not_started", ...patch };
}

describe("mentor guide", () => {
  it("resolves a knowledge check to the playbook it draws from", () => {
    expect(resourceKeyForStep(step({ type: "knowledge_check", questionSource: `playbook:${PLAYBOOK_ID}` }))).toBe(
      `playbook:${PLAYBOOK_ID}`,
    );
    expect(resourceKeyForStep(step({ type: "knowledge_check", questionSource: "docs:identity security cloud" }))).toBeNull();
  });

  it("links mentors to their own copy of the content, never the mentee's ramp", () => {
    expect(mentorPreviewHref(step({ type: "challenge", challengeId: "c1", assignmentStepId: "a1" }))).toBe(
      "/practice/challenges?focus=challenge&challenge=c1",
    );
    expect(mentorPreviewHref(step({ type: "simulation", simulationTemplateId: "t1" }))).toBe("/practice/simulations?template=t1");
    expect(mentorPreviewHref(step({ type: "content_review", resourceUrl: "/practice/pitch?scenario=p1" }))).toBe(
      "/practice/pitch?scenario=p1",
    );
    expect(mentorPreviewHref(step({ type: "content_review", resourceUrl: "tenant/assets/file.pdf" }))).toBeNull();
    expect(mentorPreviewHref(step({ type: "mentor_review", assignmentStepId: "a1" }))).toBeNull();
  });

  it("gives a strong and a weak picture, and uses the pitch picture for a pitch", () => {
    const simulation = stepExemplar(step({ type: "simulation" }));
    expect(simulation.strong).not.toBe(simulation.weak);
    expect(stepExemplar(step({ type: "content_review", resourceUrl: "/practice/pitch?scenario=atlas" })).strong).toContain(
      "next step",
    );
    expect(stepExemplar(step({ type: "playbook" })).weak).toContain("repeat the page");
    expect(stepExemplar(step({ type: "mentor_review", isSegmentGate: true })).strong).toContain("ready");
  });

  it("uses the sign-off guide for gates", () => {
    expect(mentorGuideFor(step({ type: "mentor_review", isSegmentGate: true })).purpose).toContain("hiring manager");
    expect(mentorGuideFor(step({ type: "simulation" })).ask.length).toBeGreaterThan(0);
  });
});
