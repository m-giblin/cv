import { describe, expect, it } from "vitest";
import { eligibleMentorsForEnrollment, enrollmentMentors } from "@/lib/manager/eligible-mentors";
import type { Profile } from "@/lib/types";

function profile(id: string, role: Profile["role"], fullName = id): Profile {
  return {
    id,
    email: `${id}@example.com`,
    fullName,
    role,
    level: "Basic",
    managerId: null,
    tenantId: "t",
    createdAt: "2026-01-01",
  };
}

describe("enrollmentMentors", () => {
  it("includes the signed-in manager when the org list is only their reports", () => {
    const manager = profile("matt", "manager", "Matt Giblin");
    const report = profile("finn", "basic_se", "Finn Grant");
    const mentors = enrollmentMentors([report], new Set([report.id]), manager);

    expect(mentors.map((mentor) => mentor.fullName)).toEqual(["Matt Giblin", "Finn Grant"]);
  });

  it("does not list the manager twice when they are already in the profile list", () => {
    const manager = profile("matt", "manager", "Matt Giblin");
    const mentors = enrollmentMentors([manager], new Set([manager.id]), manager);

    expect(mentors).toHaveLength(1);
    expect(mentors[0]?.id).toBe("matt");
  });
});

describe("super admins as mentors", () => {
  const people = [
    { id: "sa-team", fullName: "On Team", role: "super_admin" },
    { id: "sa-other", fullName: "Elsewhere", role: "super_admin" },
  ] as unknown as Profile[];

  it("offers a super admin only when they are on the manager's team", () => {
    const ids = eligibleMentorsForEnrollment(people, new Set(["sa-team"])).map((person) => person.id);
    expect(ids).toEqual(["sa-team"]);
  });
});
