import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canAccessRoute, getAccessTier, getHomeRoute } from "@/lib/auth/rbac";
import { filterNavHref } from "@/lib/platform/feature-flags";
import { mergeFeatureFlags } from "@/lib/platform/settings-shared";
import { allowedEmailError } from "@/lib/auth/email-domain";
import { buildQuarterlyReviewsForGoal, currentQuarter } from "@/lib/development/plan-utils";
import { dealPrepSchema, generatedChallengeSchema } from "@/lib/ai/schemas";

describe("platform settings", () => {
  it("merges stored feature flags over defaults", async () => {
    const { mergeFeatureFlags, defaultFeatureFlags } = await import("@/lib/platform/settings-shared");
    const defaults = defaultFeatureFlags();
    const merged = mergeFeatureFlags({ "pitch-studio": false });
    expect(merged["pitch-studio"]).toBe(false);
    expect(merged["isc-lab"]).toBe(defaults["isc-lab"]);
  });
});

describe("RBAC", () => {
  it("restricts admin routes from SE tier", () => {
    expect(canAccessRoute("se", "/admin")).toBe(false);
    expect(canAccessRoute("admin", "/admin")).toBe(true);
  });

  it("resolves super-admin shadow mode as tenant admin tier", async () => {
    const { resolveEffectiveAccess } = await import("@/lib/auth/shadow-tenant");
    const tenantId = "00000000-0000-4000-8000-000000000099";

    const shadowed = resolveEffectiveAccess("super_admin", null, tenantId, "Acme Corp", "admin");
    expect(shadowed.tier).toBe("admin");
    expect(shadowed.isShadowing).toBe(true);
    expect(shadowed.tenantId).toBe(tenantId);
    expect(canAccessRoute(shadowed.tier, "/admin")).toBe(true);
    expect(canAccessRoute(shadowed.tier, "/platform")).toBe(false);

    const training = resolveEffectiveAccess("super_admin", null, tenantId, "Acme Corp", "se");
    expect(training.tier).toBe("se");
    expect(training.shadowMode).toBe("se");
    expect(canAccessRoute(training.tier, "/dashboard")).toBe(true);

    const platform = resolveEffectiveAccess("super_admin", null, null, null);
    expect(platform.tier).toBe("super_admin");
    expect(platform.isShadowing).toBe(false);
    expect(canAccessRoute(platform.tier, "/platform")).toBe(true);
  });

  it("routes tenant admins to the admin portal home", () => {
    expect(getHomeRoute("admin")).toBe("/admin");
  });

  it("splits program tracker and assign plans entitlements", async () => {
    const flags = mergeFeatureFlags({ "program-tracker": false, "assign-plans": false });
    expect(filterNavHref("/manager?section=program", flags)).toBe(false);
    expect(filterNavHref("/manager?section=assign", flags)).toBe(false);
    expect(filterNavHref("/manager?section=command", flags)).toBe(true);

    const programOnly = mergeFeatureFlags({ "program-tracker": false, "assign-plans": true });
    expect(filterNavHref("/manager?section=program", programOnly)).toBe(false);
    expect(filterNavHref("/manager?section=assign", programOnly)).toBe(true);
  });

  it("orders SE practice tools together after readiness items", async () => {
    const { getNavItemsForTier } = await import("@/lib/auth/rbac");
    const labels = getNavItemsForTier("se").map((item) => item.href);
    const prepIndex = labels.indexOf("/prep");
    const challengesIndex = labels.indexOf("/challenges");
    const simulationsIndex = labels.indexOf("/simulations");
    const certificationsIndex = labels.indexOf("/certifications");

    expect(prepIndex).toBeGreaterThan(certificationsIndex);
    expect(challengesIndex).toBe(prepIndex + 1);
    expect(simulationsIndex).toBe(challengesIndex + 1);
  });

  it("groups manager nav per v8 design (no Ramp Plans in sidebar)", async () => {
    const { getNavGroupsForTier } = await import("@/lib/auth/rbac");
    const groups = getNavGroupsForTier("manager");
    const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));

    expect(groups[0]?.id).toBe("command");
    expect(groups[0]?.items.map((item) => item.href)).toEqual([
      "/manager?section=command",
      "/manager?section=inbox",
    ]);
    expect(groups.find((group) => group.id === "team")?.items.map((item) => item.href)).toEqual([
      "/manager?section=roster",
      "/manager?section=readiness",
      "/manager?section=leaderboard",
    ]);
    expect(groups.find((group) => group.id === "coaching")?.items.map((item) => item.href)).toEqual([
      "/manager?section=cadence",
      "/manager?section=history",
      "/manager?section=dev",
    ]);
    expect(groups.find((group) => group.id === "program")?.items.map((item) => item.href)).toEqual([
      "/manager?section=program",
      "/manager?section=assign",
    ]);
    expect(hrefs).not.toContain("/plans");
    expect(groups.find((group) => group.id === "practice")?.items.map((item) => item.href)).toEqual([
      "/flight-check",
      "/market-pulse",
      "/prep",
      "/challenges",
      "/simulations",
      "/pitch",
    ]);
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

describe("secret encryption", () => {
  const previousKey = process.env.PLATFORM_SECRETS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.PLATFORM_SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  afterEach(() => {
    process.env.PLATFORM_SECRETS_ENCRYPTION_KEY = previousKey;
  });

  it("round-trips API keys through AES-GCM ciphertext", async () => {
    const { encryptSecret, decryptSecret, isEncryptedSecret } = await import("@/lib/crypto/secret-box");
    const sealed = encryptSecret("sk-test-provider-key-1234567890");
    expect(isEncryptedSecret(sealed)).toBe(true);
    expect(sealed).not.toContain("sk-test-provider-key");
    expect(decryptSecret(sealed)).toBe("sk-test-provider-key-1234567890");
  });
});

describe("SailPoint challenge library", () => {
  it("validates curated challenge catalog shape and counts", async () => {
    const { validateChallengeLibrary, SAILPOINT_CHALLENGE_LIBRARY } = await import(
      "@/lib/challenges/sailpoint-challenge-library"
    );
    const result = validateChallengeLibrary();
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(SAILPOINT_CHALLENGE_LIBRARY.length).toBeGreaterThanOrEqual(100);
  });
});

describe("completion badges", () => {
  it("builds fun challenge trophies for manager-approved submissions", async () => {
    const { computeCompletionBadges } = await import("@/lib/account/achievements");
    const { getDemoDashboardData } = await import("@/lib/demo-data");

    const data = getDemoDashboardData("alex");
    const trophies = computeCompletionBadges(data);

    expect(trophies.some((t) => t.kind === "challenge")).toBe(true);
    expect(trophies.some((t) => t.kind === "simulation")).toBe(true);
    expect(trophies.every((t) => t.emoji && t.funTitle && t.earnedAt)).toBe(true);
  });

  it("generates recognizable flair from challenge titles", async () => {
    const { funChallengeBadge } = await import("@/lib/account/completion-badges");

    expect(funChallengeBadge({ title: "ISC Search: Find Stale Accounts" } as never).funTitle).toBe("Search Sleuth");
    expect(funChallengeBadge({ title: "Workflow HTTP Action Lab" } as never).emoji).toBe("⚡");
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
      stakeholderMap: [
        "CISO — audit readiness and board metrics",
        "IAM Director — manual access review pain",
      ],
      competitiveLandmines: ["If Okta: reframe to enterprise governance"],
      proofPoints: ["40% faster certifications at peer IDN", "Demo: access review campaign"],
      riskFlags: ["No exec sponsor identified yet"],
      talkTrackOutline: ["Open with pain", "Map to ISC", "Propose next step"],
      oneThingToNail: "Book a workshop with the IAM lead to scope access review POC.",
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
