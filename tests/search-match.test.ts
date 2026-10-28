import { describe, expect, it } from "vitest";
import { normalizeSearchText, rankMatches, scoreMatch, searchTokens } from "@/lib/search/match";

describe("search matching", () => {
  it("normalizes case, accents and punctuation", () => {
    expect(normalizeSearchText("  Joiner–Mover, Café!  ")).toBe("joiner mover cafe");
    expect(searchTokens("Discovery Simulations")).toEqual(["discovery", "simulation"]);
    expect(searchTokens("access")).toEqual(["access"]);
  });

  it("needs every word somewhere, and keywords count", () => {
    const sim = { title: "Discovery-Only — No Demo Allowed", fields: ["Dynamic buyer"], keywords: ["simulation"] };
    expect(scoreMatch("discovery simulation", sim)).not.toBeNull();
    expect(scoreMatch("discovery pitch", sim)).toBeNull();
    expect(scoreMatch("", sim)).toBeNull();
  });

  it("finds the Atlas chapter by title and the summary-only match below it", () => {
    const chapters = [
      { title: "The Master Narrative", summary: "Synthesizing the Atlas story into one conversation" },
      { title: "Workflows", summary: "Orchestrating identity automation without custom code" },
      { title: "The Atlas Platform and SailPoint Identity Fabric", summary: "The foundation every other capability runs on" },
    ];
    const ranked = rankMatches("atlas", chapters, (row) => ({ title: row.title, fields: [row.summary] }));
    expect(ranked.map((row) => row.title)).toEqual(["The Atlas Platform and SailPoint Identity Fabric", "The Master Narrative"]);
  });

  it("ranks exact and prefix title matches first, keeps ties in order, and caps the list", () => {
    const items = ["Leaver checklist", "Joiner", "Foundation: Joiner, mover, and leaver", "Joiner basics", "a", "b"].map((title) => ({ title }));
    const ranked = rankMatches("joiner", items, (item) => item, 2).map((item) => item.title);
    expect(ranked).toEqual(["Joiner", "Joiner basics"]);
    const all = rankMatches("joiner", items, (item) => item, 10).map((item) => item.title);
    expect(all).toEqual(["Joiner", "Joiner basics", "Foundation: Joiner, mover, and leaver"]);
  });

  it("ranks a chapter that covers a phrase above one that only has its words scattered", () => {
    const chapters = [
      { title: "Lifecycle Management", coverage: "Profile every identity source and grant access on day one" },
      { title: "Role-Based Governance", coverage: "Where an access profile sits between entitlements and roles" },
    ];
    const ranked = rankMatches("access profile", chapters, (row) => ({ title: row.title, keywords: [row.coverage] }));
    expect(ranked.map((row) => row.title)).toEqual(["Role-Based Governance", "Lifecycle Management"]);
  });
});

