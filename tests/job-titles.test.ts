import { describe, expect, it } from "vitest";
import { accessForRole, findJobTitle, normalizeJobTitles, roleForJobTitle } from "@/lib/tenant/job-titles";

describe("job titles", () => {
  it("cleans a saved list", () => {
    expect(
      normalizeJobTitles([
        { name: "  Account   Executive ", access: "learner" },
        { name: "account executive", access: "manager" },
        { name: "", access: "learner" },
        { name: "Sales Manager", access: "boss" },
        { name: "Sales Manager", access: "manager" },
      ]),
    ).toEqual([
      { name: "Account Executive", access: "learner" },
      { name: "Sales Manager", access: "manager" },
    ]);
    expect(normalizeJobTitles(null)).toEqual([]);
  });

  it("gives access through the built-in roles, keeping a role that already fits", () => {
    const ae = { name: "Account Executive", access: "learner" as const };
    const lead = { name: "Sales Manager", access: "manager" as const };
    expect(roleForJobTitle(ae)).toBe("basic_se");
    expect(roleForJobTitle(ae, "senior_se")).toBe("senior_se");
    expect(roleForJobTitle(ae, "manager")).toBe("basic_se");
    expect(roleForJobTitle(lead, "mentor")).toBe("mentor");
    expect(roleForJobTitle({ name: "Ops", access: "admin" }, "super_admin")).toBe("admin");
    expect(accessForRole("director")).toBe("admin");
  });

  it("finds a title however it's capitalised", () => {
    const titles = [{ name: "Account Executive", access: "learner" as const }];
    expect(findJobTitle(titles, "account executive")?.name).toBe("Account Executive");
    expect(findJobTitle(titles, "Engineer")).toBeNull();
    expect(findJobTitle(titles, null)).toBeNull();
  });
});
