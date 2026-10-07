import { ADMIN_ARTICLES } from "@/lib/help/articles/admin";
import { BOSUN_ARTICLES } from "@/lib/help/articles/bosun";
import { PLAYBOOK_ARTICLES } from "@/lib/help/articles/playbooks";
import { MANAGER_ARTICLES } from "@/lib/help/articles/manager";
import { SE_ARTICLES } from "@/lib/help/articles/se";
import type { HelpArticle, HelpAudience } from "@/lib/help/types";
import type { WorkspaceHat } from "@/lib/auth/workspace";

export const ALL_HELP_ARTICLES: HelpArticle[] = [
  ...BOSUN_ARTICLES,
  ...SE_ARTICLES,
  ...MANAGER_ARTICLES,
  ...ADMIN_ARTICLES,
  ...PLAYBOOK_ARTICLES,
];

/**
 * Which articles a person may read, from the workspaces they hold (not the one they're viewing):
 * SEs read SE articles; managers also read SE articles so they can coach; admins and platform
 * operators read everything.
 */
export function helpAudiencesForHats(hats: WorkspaceHat[]): HelpAudience[] {
  if (hats.includes("platform") || hats.includes("tenant_admin")) return ["se", "manager", "admin"];
  if (hats.includes("manager")) return ["se", "manager"];
  return ["se"];
}

export function helpArticlesFor(audiences: HelpAudience[]): HelpArticle[] {
  return ALL_HELP_ARTICLES.filter((article) => article.audience.some((audience) => audiences.includes(audience)));
}
