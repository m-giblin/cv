import { describe, expect, it } from "vitest";
import {
  MANAGER_SECTION_PATHS,
  canonicalHref,
  managerSectionHref,
  sectionFromManagerPath,
} from "@/lib/manager/manager-routes";

describe("manager routes", () => {
  it("rewrites legacy section links to nested routes and keeps other params", () => {
    expect(canonicalHref("/manager?section=inbox")).toBe("/manager/inbox");
    expect(canonicalHref("/manager?section=roster&profile=abc")).toBe("/manager/team?profile=abc");
    expect(canonicalHref("/manager?section=command")).toBe("/manager");
    expect(canonicalHref("/manager?section=assign")).toBe("/plans");
  });

  it("leaves other hrefs untouched", () => {
    expect(canonicalHref("/manager?profile=abc")).toBe("/manager?profile=abc");
    expect(canonicalHref("/manager?section=bogus")).toBe("/manager?section=bogus");
    expect(canonicalHref("/dashboard")).toBe("/dashboard");
  });

  it("maps paths back to sections", () => {
    for (const [section, path] of Object.entries(MANAGER_SECTION_PATHS)) {
      expect(sectionFromManagerPath(path)).toBe(section);
    }
    expect(sectionFromManagerPath("/manager/team/")).toBe("roster");
    expect(sectionFromManagerPath("/manager/nope")).toBeNull();
  });

  it("builds section hrefs with params", () => {
    expect(managerSectionHref("cadence", { profile: "x" })).toBe("/manager/coaching?profile=x");
  });
});
