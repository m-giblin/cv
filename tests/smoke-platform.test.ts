import { describe, expect, it } from "vitest";
import { canAccessRoute, getNavGroupsForTier, NAV_ITEMS } from "@/lib/auth/rbac";

const CORE_PAGES = [
  "/dashboard",
  "/manager?section=command",
  "/pitch",
  "/lab",
  "/challenges",
  "/simulations",
  "/prep",
  "/plans",
  "/development",
  "/certifications",
  "/learn",
  "/market-pulse",
  "/resources",
  "/growth",
  "/feedback",
  "/my-plan",
  "/account",
  "/admin",
  "/flight-check",
];

describe("platform route coverage", () => {
  it("maps every core page in NAV_ITEMS", () => {
    const hrefs = new Set(NAV_ITEMS.map((item) => item.href));
    for (const path of CORE_PAGES.filter((path) => path !== "/flight-check")) {
      expect(hrefs.has(path), `missing nav item for ${path}`).toBe(true);
    }
  });

  it("allows managers the team + practice workflow", () => {
    const groups = getNavGroupsForTier("manager");
    const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
    expect(hrefs).toContain("/manager?section=command");
    expect(hrefs).toContain("/pitch");
    expect(hrefs).not.toContain("/dashboard");
  });

  it("allows SEs workspace + pitch", () => {
    expect(canAccessRoute("se", "/dashboard")).toBe(true);
    expect(canAccessRoute("se", "/pitch")).toBe(true);
    expect(canAccessRoute("se", "/manager")).toBe(false);
  });
});

describe("scoped page data loaders", () => {
  it("getPitchPageData returns shell data quickly", async () => {
    const { getPitchPageData } = await import("@/lib/data/get-pitch-page-data");
    const start = performance.now();
    const { data, source } = await getPitchPageData();
    expect(performance.now() - start).toBeLessThan(500);
    expect(data.currentUser.email).toBeTruthy();
    expect(Array.isArray(data.notifications)).toBe(true);
    expect(["supabase", "demo"]).toContain(source);
  });

  it("getLabPageData matches pitch shell shape", async () => {
    const { getLabPageData } = await import("@/lib/data/get-lab-page-data");
    const { data } = await getLabPageData();
    expect(data.currentUser.id).toBeTruthy();
    expect(Array.isArray(data.notifications)).toBe(true);
  });

  it("getDashboardPageData returns user-scoped dashboard slice", async () => {
    const { getDashboardPageData } = await import("@/lib/data/get-dashboard-page-data");
    const start = performance.now();
    const { data } = await getDashboardPageData();
    expect(performance.now() - start).toBeLessThan(800);
    expect(data.currentUser).toBeTruthy();
    expect(Array.isArray(data.plans)).toBe(true);
    expect(Array.isArray(data.coachingCards)).toBe(true);
  });

  it("getManagerPageData returns org-shaped dashboard", async () => {
    const { getManagerPageData } = await import("@/lib/data/get-manager-page-data");
    const start = performance.now();
    const { data } = await getManagerPageData();
    expect(performance.now() - start).toBeLessThan(800);
    expect(data.currentUser).toBeTruthy();
    expect(Array.isArray(data.myOrg)).toBe(true);
    expect(Array.isArray(data.coachingCards)).toBe(true);
  });

  it("getChallengesPageData returns challenge list rows", async () => {
    const { getChallengesPageData } = await import("@/lib/data/get-challenges-page-data");
    const { data } = await getChallengesPageData();
    expect(data.challenges.length).toBeGreaterThan(0);
    const first = data.challenges[0]!;
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("title");
    expect(Array.isArray(first.steps)).toBe(true);
  });
});

describe("API route modules", () => {
  const apiRoutes = [
    "@/app/api/pitch/library/route",
    "@/app/api/integrations/status/route",
    "@/app/api/engagement/route",
    "@/app/api/deal-prep/sessions/route",
    "@/app/api/gamification/scorecard/route",
    "@/app/api/market-pulse/route",
    "@/app/api/challenges/route",
    "@/app/api/manager/isc-lab-stats/route",
  ];

  for (const route of apiRoutes) {
    it(`exports handlers from ${route.split("/").slice(-2).join("/")}`, async () => {
      const mod = await import(route);
      expect(typeof mod.GET === "function" || typeof mod.POST === "function").toBe(true);
    });
  }
});

describe("ISC Lab excellence", () => {
  it("rankDocEntries returns battlecard-relevant docs", async () => {
    const { rankDocEntries } = await import("@/lib/isc-lab/doc-index");
    const start = performance.now();
    const ranked = rankDocEntries("Okta competitive agent governance", 4);
    expect(performance.now() - start).toBeLessThan(50);
    expect(ranked.length).toBeGreaterThan(0);
  });

  it("buildIscLabSystemPrompt includes grounding rules", async () => {
    const { buildIscLabSystemPrompt } = await import("@/lib/isc-lab/retrieve-context");
    const prompt = buildIscLabSystemPrompt("Test context block");
    expect(prompt).toContain("Cite sources");
    expect(prompt).toContain("Test context block");
  });
});

describe("simulation + challenge libraries", () => {
  it("simulation template library has 20+ templates", async () => {
    const { SIMULATION_TEMPLATE_LIBRARY } = await import("@/lib/simulations/simulation-template-library");
    expect(SIMULATION_TEMPLATE_LIBRARY.length).toBeGreaterThanOrEqual(20);
  });
});
