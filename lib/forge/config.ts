export const FORGE_PROJECT_KEY = process.env.FORGE_PROJECT_KEY ?? "SEENA";
export const FORGE_ASSIGNEE_EMAIL = process.env.FORGE_ASSIGNEE_EMAIL ?? "matt.j.giblin@gmail.com";
export const FORGE_ASSIGNEE_NAME = process.env.FORGE_ASSIGNEE_NAME ?? "Matt Giblin";
export const FORGE_DEFAULT_STATUS = process.env.FORGE_DEFAULT_STATUS ?? "backlog";

export const FORGE_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export const FORGE_STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"] as const;

/** Used when Forge categories API is unavailable — category_id is omitted on create. */
export const FORGE_FALLBACK_CATEGORIES = [
  { id: "general", name: "General / UI" },
  { id: "auth", name: "Authentication & MFA" },
  { id: "manager", name: "Manager workflows" },
  { id: "se", name: "SE workflows" },
  { id: "admin", name: "Admin console" },
  { id: "data", name: "Data / plans" },
  { id: "other", name: "Other" },
] as const;

export function isForgeConfigured() {
  return Boolean(process.env.FORGE_API_KEY?.trim());
}

export function getForgeAssigneeIdFromEnv() {
  const id = process.env.FORGE_ASSIGNEE_ID?.trim();
  return id && id.length > 0 ? id : null;
}

export function getForgeBaseUrl() {
  return (process.env.FORGE_API_BASE_URL ?? "https://forge-nu-ochre.vercel.app").replace(/\/$/, "");
}
