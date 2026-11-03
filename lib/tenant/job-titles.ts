import type { ProfileRole } from "@/lib/types";

/**
 * Job titles a tenant defines for its people. A title is a label; its access level decides what the
 * person can do, through the built-in role it maps to (profiles.role), so permissions never depend
 * on what a tenant calls someone.
 */
export type JobTitleAccess = "learner" | "manager" | "admin";
export type JobTitle = { name: string; access: JobTitleAccess };

export const JOB_TITLE_MAX = 60;
export const JOB_TITLES_MAX = 30;

export const ACCESS_LABEL: Record<JobTitleAccess, string> = {
  learner: "Learner: does the training",
  manager: "Manager: coaches a team",
  admin: "Admin: runs this tenant",
};

/** The access level a built-in role gives. */
export function accessForRole(role: ProfileRole): JobTitleAccess {
  if (role === "admin" || role === "director" || role === "super_admin") return "admin";
  if (role === "manager" || role === "mentor") return "manager";
  return "learner";
}

const DEFAULT_ROLE: Record<JobTitleAccess, ProfileRole> = { learner: "basic_se", manager: "manager", admin: "admin" };

/**
 * The role to store when someone gets a title: their current role if it already gives that access
 * (a senior SE stays senior_se), otherwise the default role for the access.
 */
export function roleForJobTitle(title: JobTitle, currentRole?: ProfileRole | null): ProfileRole {
  if (currentRole && currentRole !== "super_admin" && accessForRole(currentRole) === title.access) return currentRole;
  return DEFAULT_ROLE[title.access];
}

/** Cleans a saved list: trimmed names, no blanks or duplicates (case-insensitive), known access only. */
export function normalizeJobTitles(value: unknown): JobTitle[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const titles: JobTitle[] = [];
  for (const item of value) {
    const name = typeof item?.name === "string" ? item.name.trim().replace(/\s+/g, " ").slice(0, JOB_TITLE_MAX) : "";
    const access = item?.access;
    if (!name || !["learner", "manager", "admin"].includes(access) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    titles.push({ name, access });
  }
  return titles.slice(0, JOB_TITLES_MAX);
}

export function findJobTitle(titles: JobTitle[], name: string | null | undefined) {
  const key = name?.trim().toLowerCase();
  return key ? titles.find((title) => title.name.toLowerCase() === key) ?? null : null;
}
