import type { Profile } from "@/lib/types";

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
      if (profile.role === "super_admin") return false;
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
      if (profile.role === "super_admin") return false;
      return orgUserIds.has(profile.id) || MENTOR_CAPABLE_ROLES.has(profile.role);
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}
