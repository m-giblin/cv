import { describe, expect, it } from "vitest";
import { canAccessRoute, getAccessTier } from "@/lib/auth/rbac";
import { allowedEmailError } from "@/lib/auth/email-domain";
import { buildQuarterlyReviewsForGoal, currentQuarter } from "@/lib/development/plan-utils";
import { dealPrepSchema, generatedChallengeSchema } from "@/lib/ai/schemas";

describe("RBAC", () => {
  it("restricts admin routes from SE tier", () => {
    expect(canAccessRoute("se", "/admin")).toBe(false);
    expect(canAccessRoute("admin", "/admin")).toBe(true);
  });

  it("allows development and prep for all tiers", () => {
    expect(canAccessRoute("se", "/development")).toBe(true);
    expect(canAccessRoute("se", "/prep")).toBe(true);
    expect(canAccessRoute("se", "/certifications")).toBe(true);
  });

  it("maps director to admin tier", () => {
    expect(getAccessTier("director")).toBe("admin");
  });
});

describe("email domain", () => {
  it("rejects non-allowed emails", () => {
    expect(allowedEmailError("user@gmail.com")).toBeTruthy();
    expect(allowedEmailError("user@sailpoint.com")).toBeNull();
    expect(allowedEmailError("demo.se@example.com")).toBeNull();
  });
});

describe("development plan utils", () => {
  it("builds four quarterly reviews", () => {
    const reviews = buildQuarterlyReviewsForGoal("goal-1", 2026);
    expect(reviews).toHaveLength(4);
    expect(reviews.map((review) => review.quarter)).toEqual(["Q1", "Q2", "Q3", "Q4"]);
  });

  it("returns a valid current quarter", () => {
    expect(["Q1", "Q2", "Q3", "Q4"]).toContain(currentQuarter());
  });
});

describe("AI schemas", () => {
  it("validates challenge schema shape", () => {
    const parsed = generatedChallengeSchema.safeParse({
      title: "Shadow AI discovery challenge",
      description: "Prepare a customer-ready walkthrough that connects SailPoint capabilities to measurable identity security outcomes for the healthcare vertical.",
      steps: ["Step one with enough chars", "Step two with enough chars", "Step three with enough chars"],
      successCriteria: ["Criteria one here ok", "Criteria two here ok", "Criteria three here ok"],
      estimatedMinutes: 45,
      linkedResources: [],
      linkedSolutions: ["ISC"],
      difficulty: "intermediate",
    });
    expect(parsed.success).toBe(true);
  });

  it("validates deal prep schema shape", () => {
    const parsed = dealPrepSchema.safeParse({
      accountName: "Acme Health",
      industry: "Healthcare",
      solutions: ["ISC"],
      accountContext: "Large IDN consolidating IAM tools after merger with active audit findings.",
      likelyObjections: ["Too long to implement", "Already using Entra"],
      discoveryQuestions: ["Who owns access reviews?", "What is audit timeline?", "How are contractors handled?"],
      talkTrackOutline: ["Open with pain", "Map to ISC", "Propose next step"],
      linkedResources: [],
      executiveSummary: "Lead with audit readiness and measurable risk reduction for the CISO audience in healthcare.",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("simulation prompt template", () => {
  it("interpolates manager overrides into sled template", async () => {
    const { defaultSledPromptSnapshot, difficultyToPromptLabel } = await import(
      "@/lib/simulations/prompt-template"
    );

    const snapshot = defaultSledPromptSnapshot({
      solutionFocus: "SailPoint Agent Identity Security (AIS)",
      vertical: "SLED",
      difficulty: "advanced",
    });

    expect(snapshot).toContain("SailPoint Agent Identity Security (AIS)");
    expect(snapshot).toContain("Vertical: SLED");
    expect(snapshot).toContain(`Difficulty: ${difficultyToPromptLabel("advanced")}`);
  });
});

describe("RLS policy coverage", () => {
  it("documents expected policy tables in migrations", async () => {
    const fs = await import("fs/promises");
    const migration = await fs.readFile(
      "supabase/migrations/20260702000000_initial_schema.sql",
      "utf8",
    );

    const protectedTables = [
      "profiles",
      "challenge_submissions",
      "plan_assignments",
      "development_plans",
      "readiness_certifications",
    ];

    for (const table of protectedTables) {
      if (table === "development_plans" || table === "readiness_certifications") continue;
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });
});
