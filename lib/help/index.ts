import { ADMIN_ARTICLES } from "@/lib/help/articles/admin";
import { BOSUN_ARTICLES } from "@/lib/help/articles/bosun";
import { PLAYBOOK_ARTICLES } from "@/lib/help/articles/playbooks";
import { MANAGER_ARTICLES } from "@/lib/help/articles/manager";
import { SE_ARTICLES } from "@/lib/help/articles/se";
import type { HelpArticle, HelpAudience } from "@/lib/help/types";
import type { WorkspaceHat } from "@/lib/auth/workspace";
import { DEFAULT_LEARNER_TERMS, fillLearnerTermsDeep, type LearnerTerms } from "@/lib/tenant/learner-terms";

/**
 * Raw articles: their text holds learner placeholders ("{learner}", "{learners}"). Pages and the
 * assistant read them through helpArticlesFor, which fills in the tenant's term.
 */
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

/** The articles these audiences may read, with "{learner}" placeholders filled with the tenant's terms. */
export function helpArticlesFor(audiences: HelpAudience[], terms: LearnerTerms = DEFAULT_LEARNER_TERMS): HelpArticle[] {
  const visible = ALL_HELP_ARTICLES.filter((article) => article.audience.some((audience) => audiences.includes(audience)));
  return fillLearnerTermsDeep(visible, terms);
}
