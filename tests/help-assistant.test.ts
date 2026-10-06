import { describe, expect, it } from "vitest";
import { ASSISTANT_REFUSAL, BOSUN_DEFINITION, assistantSystemPrompt, isClearlyOffTopic, pickContextArticles } from "@/lib/help/assistant";
import { docSourcesFrom, isSailPointDocUrl, wantsDocsSearch } from "@/lib/help/sailpoint-docs";
import { articleAsText, searchHelp } from "@/lib/help/search";
import type { HelpArticle } from "@/lib/help/types";

const article = (id: string, title: string, extra: Partial<HelpArticle> = {}): HelpArticle => ({
  id,
  title,
  summary: `${title} summary`,
  audience: ["se"],
  category: "Test",
  keywords: [],
  steps: [{ title: "Do it", body: "Click the button." }],
  ...extra,
});

const ARTICLES = [
  article("submit", "Submit evidence for a step", { keywords: ["proof", "upload"] }),
  article("sims", "Run a simulation", { keywords: ["roleplay", "buyer"] }),
  article("bulk", "Bulk approve sim cards", {
    audience: ["manager"],
    steps: [{ title: "Tick cards", body: "Select sim cards scoring 75 or higher, then approve evidence." }],
  }),
];

describe("help search", () => {
  it("ranks title and keyword matches above body matches", () => {
    expect(searchHelp(ARTICLES, "evidence")[0]!.id).toBe("submit");
    expect(searchHelp(ARTICLES, "roleplay").map((item) => item.id)).toEqual(["sims"]);
  });

  it("ignores filler words and returns everything for an empty query", () => {
    expect(searchHelp(ARTICLES, "how do I")).toHaveLength(3);
    expect(searchHelp(ARTICLES, "how do I upload proof")[0]!.id).toBe("submit");
  });

  it("returns nothing for unrelated queries", () => {
    expect(searchHelp(ARTICLES, "football weather")).toHaveLength(0);
  });

  it("renders an article as numbered plain text for the assistant", () => {
    const text = articleAsText(ARTICLES[0]!);
    expect(text).toContain("# Submit evidence for a step");
    expect(text).toContain("1. Do it: Click the button.");
  });
});

describe("assistant guardrails", () => {
  it("refuses obvious off-topic questions before any model call", () => {
    expect(isClearlyOffTopic("What's the weather in Austin?")).toBe(true);
    expect(isClearlyOffTopic("Who won the NBA game last night, what was the score")).toBe(true);
    expect(isClearlyOffTopic("Write me a poem about cats")).toBe(true);
  });

  it("lets platform and SailPoint questions through", () => {
    expect(isClearlyOffTopic("How do I submit evidence for my ramp step?")).toBe(false);
    expect(isClearlyOffTopic("Explain SailPoint access certifications to a CISO")).toBe(false);
  });

  it("grounds the prompt in matching articles and the scope rule", () => {
    const context = pickContextArticles(ARTICLES, "how do I upload evidence");
    expect(context[0]!.id).toBe("submit");
    const prompt = assistantSystemPrompt(context, "SE");
    expect(prompt).toContain(ASSISTANT_REFUSAL);
    expect(prompt).toContain("Submit evidence for a step");
    expect(prompt).toContain("SE portal");
  });

  it("names Bosun and explains the name", () => {
    const prompt = assistantSystemPrompt([], "SE");
    expect(prompt).toContain("You are Bosun");
    expect(prompt).toContain(BOSUN_DEFINITION);
    expect(prompt).not.toContain("web_search");
    expect(assistantSystemPrompt([], "SE", true)).toContain("documentation.sailpoint.com and developer.sailpoint.com");
  });
});

describe("SailPoint docs sources", () => {
  it("searches docs only for product questions", () => {
    expect(wantsDocsSearch("How do I call the ISC transforms API?")).toBe(true);
    expect(wantsDocsSearch("How do I submit evidence for my ramp step?")).toBe(false);
  });

  it("only cites the two SailPoint doc sites over https", () => {
    expect(isSailPointDocUrl("https://developer.sailpoint.com/docs/api/v3")).toBe(true);
    expect(isSailPointDocUrl("https://documentation.sailpoint.com/saas/help/")).toBe(true);
    expect(isSailPointDocUrl("https://evil.com/?q=developer.sailpoint.com")).toBe(false);
    expect(isSailPointDocUrl("https://developer.sailpoint.com.evil.com/")).toBe(false);
    expect(isSailPointDocUrl("http://developer.sailpoint.com/")).toBe(false);
    const docs = docSourcesFrom([
      { url: "https://developer.sailpoint.com/docs/a", title: "A" },
      { url: "https://developer.sailpoint.com/docs/a", title: "A again" },
      { url: "https://example.com/b", title: "B" },
      { url: "https://documentation.sailpoint.com/c" },
    ]);
    expect(docs).toEqual([
      { title: "A", url: "https://developer.sailpoint.com/docs/a" },
      { title: "/c", url: "https://documentation.sailpoint.com/c" },
    ]);
  });
});
