import type { Profile, UserPlan } from "@/lib/types";

const LEADER_ROLES = new Set(["manager", "director", "admin", "super_admin"]);
const NEW_HIRE_DAYS = 30;

/**
 * People who are new hires themselves and so can't mentor one: anyone on an onboarding plan that
 * isn't finished, and SEs who joined in the last 30 days (even before their plan is assigned).
 */
export function newHireIds(profiles: Profile[], plans: Pick<UserPlan, "userId" | "status">[], now = Date.now()): Set<string> {
  const ids = new Set(plans.filter((plan) => plan.status !== "completed").map((plan) => plan.userId));
  for (const profile of profiles) {
    if (LEADER_ROLES.has(profile.role)) continue;
    const joined = Date.parse(profile.createdAt);
    if (Number.isFinite(joined) && now - joined < NEW_HIRE_DAYS * 86_400_000) ids.add(profile.id);
  }
  return ids;
}

/** Employees a manager can assign as onboarding mentor (not role-restricted to "mentor"). */
export function eligibleMentorsForOrg(
  profiles: Profile[],
  orgUserIds: Set<string>,
  excludeUserId?: string,
): Profile[] {
  return profiles
    .filter((profile) => {
      if (!orgUserIds.has(profile.id)) return false;
      if (excludeUserId && profile.id === excludeUserId) return false;
      return true;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

const MENTOR_CAPABLE_ROLES = new Set<string>([
  "mentor",
  "manager",
  "director",
  "admin",
  "senior_se",
  "advisory_solutions_consultant",
]);

/**
 * Mentor choices when enrolling someone in a program: everyone on the manager's own team, plus
 * anyone elsewhere in the tenant who is senior enough to mentor (so a peer team's senior SE or a
 * different manager can take on a new hire).
 */
export function eligibleMentorsForEnrollment(profiles: Profile[], orgUserIds: Set<string>): Profile[] {
  return profiles
    .filter((profile) => {
      // A super admin only counts when they sit on this manager's team (their home workspace).
      if (profile.role === "super_admin") return orgUserIds.has(profile.id);
      return orgUserIds.has(profile.id) || MENTOR_CAPABLE_ROLES.has(profile.role);
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/**
 * Mentor choices for enrollment. The org profile list is the manager's reports, so the signed-in
 * manager is added here and listed first. They can mentor a new hire on their own team.
 */
export function enrollmentMentors(
  profiles: Profile[],
  orgUserIds: Set<string>,
  viewer?: Profile | null,
  /** New hires (see newHireIds), left out because they're onboarding themselves. */
  exclude: Set<string> = new Set(),
): Profile[] {
  const pool = viewer && !profiles.some((profile) => profile.id === viewer.id) ? [viewer, ...profiles] : profiles;
  const mentors = eligibleMentorsForEnrollment(pool, orgUserIds).filter((mentor) => !exclude.has(mentor.id) || mentor.id === viewer?.id);
  if (!viewer) return mentors;
  const self = mentors.find((mentor) => mentor.id === viewer.id);
  if (!self) return mentors;
  return [self, ...mentors.filter((mentor) => mentor.id !== viewer.id)];
}
