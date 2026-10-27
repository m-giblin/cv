import { describe, expect, it } from "vitest";
import { eligibleMentorsForEnrollment, enrollmentMentors, newHireIds } from "@/lib/manager/eligible-mentors";
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

describe("new hires can't mentor", () => {
  const now = Date.parse("2026-10-27T12:00:00Z");
  const veteran = { ...profile("matt", "advisory_solutions_consultant", "Matt"), createdAt: "2024-01-01" };
  const steve = { ...profile("steve", "senior_se", "Steve"), createdAt: "2026-10-27" };
  const susan = { ...profile("susan", "senior_se", "Susan"), createdAt: "2025-01-01" };
  const kathy = { ...profile("kathy", "manager", "Kathy"), createdAt: "2026-10-27" };

  it("counts people on an open plan and SEs who joined in the last 30 days", () => {
    const ids = newHireIds([veteran, steve, susan, kathy], [{ userId: "susan", status: "not_started" }], now);
    expect([...ids].sort()).toEqual(["steve", "susan"]);
  });

  it("leaves new hires out of the mentor list but keeps the signed-in manager", () => {
    const team = [veteran, steve, susan];
    const exclude = newHireIds([...team, kathy], [{ userId: "susan", status: "in_progress" }], now);
    const mentors = enrollmentMentors(team, new Set(team.map((person) => person.id)), kathy, exclude);
    expect(mentors.map((mentor) => mentor.id)).toEqual(["kathy", "matt"]);
  });
});
