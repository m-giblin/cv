import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_HELP_ARTICLES, helpArticlesFor, helpAudiencesForHats } from "@/lib/help";

/** Every in-app link in help content must point at a real page under app/(app) or app/. */
function routeExists(href: string): boolean {
  const path = href.split(/[?#]/)[0]!.replace(/\/$/, "");
  const dirs = [`app/(app)${path}`, `app${path}`];
  return dirs.some((dir) => existsSync(`${dir}/page.tsx`));
}

describe("help content", () => {
  it("has unique ids, steps on every article and valid related links", () => {
    const ids = new Set<string>();
    for (const article of ALL_HELP_ARTICLES) {
      expect(ids.has(article.id), `duplicate id ${article.id}`).toBe(false);
      ids.add(article.id);
      expect(article.steps.length, article.id).toBeGreaterThan(0);
      expect(article.audience.length, article.id).toBeGreaterThan(0);
    }
    for (const article of ALL_HELP_ARTICLES) {
      for (const id of article.related ?? []) expect(ids.has(id), `${article.id} -> ${id}`).toBe(true);
    }
  });

  it("links only to pages that exist", () => {
    for (const article of ALL_HELP_ARTICLES) {
      for (const link of article.links ?? []) {
        expect(routeExists(link.href), `${article.id}: ${link.href}`).toBe(true);
      }
    }
  });
});

describe("help gating", () => {
  it("gives SEs only SE articles", () => {
    const audiences = helpAudiencesForHats(["se"]);
    expect(audiences).toEqual(["se"]);
    expect(helpArticlesFor(audiences).every((article) => article.audience.includes("se"))).toBe(true);
    expect(helpArticlesFor(audiences).some((article) => article.id.startsWith("admin-"))).toBe(false);
  });

  it("gives managers SE and manager articles but not admin-only ones", () => {
    const articles = helpArticlesFor(helpAudiencesForHats(["manager", "se"]));
    expect(articles.some((article) => article.id.startsWith("mgr-"))).toBe(true);
    expect(articles.some((article) => article.audience.length === 1 && article.audience[0] === "admin")).toBe(false);
  });

  it("gives tenant admins and platform operators everything", () => {
    expect(helpArticlesFor(helpAudiencesForHats(["tenant_admin"]))).toHaveLength(ALL_HELP_ARTICLES.length);
    expect(helpArticlesFor(helpAudiencesForHats(["platform"]))).toHaveLength(ALL_HELP_ARTICLES.length);
  });
});
