import { describe, expect, it } from "vitest";
import { fillLearnerTerms, fillLearnerTermsDeep, possessive, resolveLearnerTerms, withArticle } from "@/lib/tenant/learner-terms";

const ae = { one: "AE", many: "AEs" };

describe("learner terms", () => {
  it("defaults to SE and adds an s when only the singular is set", () => {
    expect(resolveLearnerTerms(null)).toEqual({ one: "SE", many: "SEs" });
    expect(resolveLearnerTerms({ learnerTerm: " AE " })).toEqual(ae);
    expect(resolveLearnerTerms({ learnerTerm: "Rep", learnerTermPlural: "Reps" })).toEqual({ one: "Rep", many: "Reps" });
  });

  it("picks a or an by sound", () => {
    expect(withArticle("SE")).toBe("an SE");
    expect(withArticle("AE")).toBe("an AE");
    expect(withArticle("BDR")).toBe("a BDR");
    expect(withArticle("rep")).toBe("a rep");
    expect(withArticle("account executive")).toBe("an account executive");
    expect(possessive("AE")).toBe("AE's");
    expect(possessive("AEs")).toBe("AEs'");
  });

  it("fills placeholders in fixed text, including inside objects", () => {
    expect(fillLearnerTerms("What {learners} rehearse, as {a learner} sees it; the {learner's} plan.", ae)).toBe(
      "What AEs rehearse, as an AE sees it; the AE's plan.",
    );
    expect(fillLearnerTerms("No placeholders", ae)).toBe("No placeholders");
    expect(fillLearnerTermsDeep({ title: "{learners} only", steps: [{ body: "{a learner}" }], n: 3 }, ae)).toEqual({
      title: "AEs only",
      steps: [{ body: "an AE" }],
      n: 3,
    });
  });
});
