/**
 * Canonical manager portal routes. The portal used to be one page switched by `?section=`;
 * each section now has its own path. Old `?section=` URLs are still accepted (stored
 * notification links, bookmarks) and redirect here.
 */

export type ManagerSectionId =
  | "command"
  | "inbox"
  | "roster"
  | "readiness"
  | "leaderboard"
  | "mentees"
  | "cadence"
  | "history"
  | "dev"
  | "program"
  | "assign";

export const MANAGER_SECTION_PATHS: Record<ManagerSectionId, string> = {
  command: "/manager",
  inbox: "/manager/inbox",
  roster: "/manager/team",
  readiness: "/manager/team/readiness",
  leaderboard: "/manager/team/leaderboard",
  mentees: "/manager/team/mentees",
  cadence: "/manager/coaching",
  history: "/manager/coaching/history",
  dev: "/manager/coaching/development",
  program: "/manager/programs",
  assign: "/plans",
};

export function isManagerSectionId(value: string | null | undefined): value is ManagerSectionId {
  return Boolean(value && value in MANAGER_SECTION_PATHS);
}

export function managerSectionHref(section: ManagerSectionId, params?: Record<string, string>): string {
  const query = params ? new URLSearchParams(params).toString() : "";
  return query ? `${MANAGER_SECTION_PATHS[section]}?${query}` : MANAGER_SECTION_PATHS[section];
}

/** Section for a manager path, or null when the path is not a manager section. */
export function sectionFromManagerPath(pathname: string): ManagerSectionId | null {
  const clean = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  const entry = (Object.entries(MANAGER_SECTION_PATHS) as [ManagerSectionId, string][]).find(
    ([, path]) => path === clean,
  );
  return entry ? entry[0] : null;
}

/**
 * Rewrites a legacy `/manager?section=x&…` href to its canonical path, keeping other params.
 * Any other href is returned unchanged.
 */
export function canonicalHref(href: string): string {
  const [path, query = ""] = href.split("?");
  if (path !== "/manager") return href;
  const params = new URLSearchParams(query);
  const section = params.get("section");
  if (!isManagerSectionId(section)) return href;
  params.delete("section");
  const rest = params.toString();
  const target = MANAGER_SECTION_PATHS[section];
  return rest ? `${target}?${rest}` : target;
}
