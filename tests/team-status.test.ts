import { describe, expect, it } from "vitest";
import { buildTeamMember } from "@/lib/manager/team-status";
import type { Profile, UserPlan } from "@/lib/types";

const NOW = Date.parse("2026-10-28T12:00:00Z");

function person(createdAt: string): Profile {
  return { id: "p1", fullName: "Kevin Jones", email: "k@example.com", level: "Senior", role: "senior_se", createdAt } as unknown as Profile;
}

function plan(startDate: string, dueDate: string, status = "not_started"): UserPlan {
  return { startDate, progress: 0, steps: [{ dueDate, status }] } as unknown as UserPlan;
}

describe("buildTeamMember for new starters", () => {
  it("does not flag a brand-new hire at risk for low readiness in the first weeks of a plan", () => {
    const member = buildTeamMember({
      profile: person("2026-10-27T00:00:00Z"),
      plan: plan("2026-10-27", "2026-11-10"),
      openReviewCount: 0,
      readiness: 16,
      daysSinceCoaching: null,
      now: NOW,
    });
    expect(member.status).toBe("on_track");
    expect(member.reason).toBe("Ramping, week 1");
  });

  it("asks for a plan, without calling it a risk, when a new starter has none", () => {
    const member = buildTeamMember({ profile: person("2026-10-27T00:00:00Z"), openReviewCount: 0, readiness: 16, daysSinceCoaching: null, now: NOW });
    expect(member.status).toBe("on_track");
    expect(member.action?.kind).toBe("assign_plan");
  });

  it("still flags overdue work during the first weeks", () => {
    const member = buildTeamMember({
      profile: person("2026-10-01T00:00:00Z"),
      plan: plan("2026-10-20", "2026-10-22"),
      openReviewCount: 0,
      readiness: 16,
      daysSinceCoaching: null,
      now: NOW,
    });
    expect(member.status).toBe("at_risk");
    expect(member.reason).toContain("overdue");
  });

  it("flags low readiness once someone is past the new-starter window", () => {
    const member = buildTeamMember({ profile: person("2026-01-01T00:00:00Z"), openReviewCount: 0, readiness: 40, daysSinceCoaching: null, now: NOW });
    expect(member.status).toBe("at_risk");
  });
});

describe("buildTeamMember follow-ups", () => {
  it("drops the Schedule a 1:1 nudge once a 1:1 is booked", () => {
    const member = buildTeamMember({
      profile: person("2026-10-27T00:00:00Z"),
      plan: plan("2026-10-27", "2026-11-10"),
      openReviewCount: 0,
      readiness: 16,
      daysSinceCoaching: null,
      nextOneOnOne: "Thu, Oct 29, 10:00 AM EDT",
      now: NOW,
    });
    expect(member.action).toBeNull();
    expect(member.reason).toBe("Ramping, week 1, 1:1 booked");
    expect(member.newStarter).toBe(true);
  });

  it("does not flag an experienced person with no plan just for being quiet", () => {
    const member = buildTeamMember({
      profile: person("2024-01-01T00:00:00Z"),
      coaching: { health: "on_track", lastActiveDays: 19, talkingPoints: [] } as never,
      openReviewCount: 0,
      readiness: null,
      daysSinceCoaching: null,
      now: NOW,
    });
    expect(member.status).toBe("on_track");
    expect(member.newStarter).toBe(false);
  });
});
