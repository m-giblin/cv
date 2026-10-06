import { redirect } from "next/navigation";
import { HelpCenter } from "@/components/help/help-center";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { helpArticlesFor, helpAudiencesForHats } from "@/lib/help";
import { loadShellData } from "@/lib/shell/load-shell-data";

/** Help Center for every portal. Only articles this person may read are sent to the browser. */
export default async function HelpPage() {
  const shell = await loadShellData();
  if (!shell) redirect(AUTH_ROUTES.login);
  const audiences = helpAudiencesForHats(shell.workspaceHats);
  return <HelpCenter articles={helpArticlesFor(audiences)} audiences={audiences} />;
}
