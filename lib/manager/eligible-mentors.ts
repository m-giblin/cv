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
