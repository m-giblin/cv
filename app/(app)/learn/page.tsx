import { LearnLibrary, type StartHerePick } from "@/components/learn/learn-library";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { getUserReleaseProjectTags } from "@/lib/corpus/user-release-tags";
import { GENAI_VS_AGENTIC_MODULES } from "@/lib/learn/agentic-curriculum";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { loadPlatformSettings } from "@/lib/platform/settings";
import { loadPlaybookChapterSummaries, playbookChapterHref } from "@/lib/search/playbook-chapters";
import { isStepValidated, sortSteps } from "@/lib/se/ramp-model";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Learn" };

const AGENTIC_TRACK_MODULE_IDS = new Set(["agentic-ai", "ais-positioning", "customer-discovery"]);

export default async function LearnPage() {
  const [{ data }, context] = await Promise.all([requireAppAccess("/learn"), resolveTenantContext()]);
  // Managers, admins and operators can assign library items to their team.
  const canAssign = Boolean(context?.tenantId && ["manager", "admin", "super_admin"].includes(context.tier));
  const [settings, playbooks] = await Promise.all([
    loadPlatformSettings(data.currentUser.tenantId ?? undefined),
    // Playbook chapters sit in the library too, so search and the Playbooks filter find them.
    context?.tenantId ? loadPlaybookChapterSummaries(context.tenantId) : Promise.resolve([]),
  ]);
  const agenticTrackEnabled = isFeatureEnabled(settings.featureFlags, "agentic-ai-track");
  const labEnabled = isFeatureEnabled(settings.featureFlags, "isc-lab");
  const supabase = await createClient();
  const releaseProjectTags =
    supabase && data.currentUser.id ? await getUserReleaseProjectTags(supabase, data.currentUser.id) : [];
  const modules = agenticTrackEnabled
    ? GENAI_VS_AGENTIC_MODULES
    : GENAI_VS_AGENTIC_MODULES.filter((module) => !AGENTIC_TRACK_MODULE_IDS.has(module.id));

  const plan = data.plans.find((item) => item.userId === data.currentUser.id);
  const openSteps = sortSteps(plan?.steps ?? []).filter((step) => !step.locked && !isStepValidated(step.status));
  const rampPicks = openSteps.filter((step) => Boolean(step.contentAssetId || step.resourceUrl)).length;

  // Someone on an active ramp starts with what their current step links to, then the playbook's
  // first chapter; the module path only leads for people without a ramp.
  let startHere: StartHerePick | null = null;
  if (plan && plan.status !== "completed") {
    const step = openSteps.find((item) => Boolean(item.contentAssetId || item.resourceUrl || item.playbookSlug));
    const stepHref = step?.assignmentStepId ? `/my-plan?step=${encodeURIComponent(step.assignmentStepId)}` : "/my-plan";
    if (step?.contentAssetId || step?.resourceUrl) {
      const { data: asset } =
        step.contentAssetId && supabase
          ? await supabase.from("content_assets").select("title, storage_path").eq("id", step.contentAssetId).maybeSingle()
          : { data: null };
      const href = (asset as { storage_path: string | null } | null)?.storage_path ?? step.resourceUrl;
      if (href) {
        startHere = {
          title: (asset as { title: string | null } | null)?.title ?? step.title,
          caption: `For your ramp step: ${step.title}`,
          href,
          external: true,
          stepHref,
        };
      }
    } else if (step?.playbookSlug) {
      const chapter = playbooks.find((item) => item.slug === step.playbookSlug);
      startHere = {
        title: chapter?.title ?? step.title,
        caption: `For your ramp step: ${step.title}`,
        numeral: chapter?.chapter,
        href: playbookChapterHref(step.playbookSlug),
        external: false,
        stepHref,
      };
    }
    const firstChapter = playbooks.find((item) => item.chapter === 1) ?? playbooks[0];
    if (!startHere && firstChapter) {
      startHere = {
        title: firstChapter.title,
        caption: firstChapter.summary || "Where the playbook begins",
        numeral: firstChapter.chapter,
        href: playbookChapterHref(firstChapter.slug),
        external: false,
      };
    }
  }

  return (
    <>
      <PageHeader accent="Find it in a minute." eyebrow="Learn" title="Learn." />
      <PageBody className="pb-7">
        <LearnLibrary
          canAssign={canAssign}
          labEnabled={labEnabled}
          modules={modules}
          pathName="GenAI vs Agentic AI"
          playbooks={playbooks}
          rampPicks={rampPicks}
          releaseProjectTags={releaseProjectTags}
          startHere={startHere}
        />
      </PageBody>
    </>
  );
}
