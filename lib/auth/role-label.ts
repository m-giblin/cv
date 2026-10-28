import type { ProfileRole } from "@/lib/types";

const ROLE_LABEL: Record<ProfileRole, string> = {
  basic_se: "SE",
  senior_se: "Senior SE",
  advisory_solutions_consultant: "Advisory Solutions Consultant",
  mentor: "Mentor",
  manager: "Manager",
  director: "Director",
  admin: "Admin",
  super_admin: "Admin",
};

/** A role as people say it ("Senior SE"), never the stored code ("senior_se"). */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role as ProfileRole] ?? role.replaceAll("_", " ");
}
