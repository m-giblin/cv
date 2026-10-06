import { AppShell } from "@/components/app-shell";
import { LearnLibrary } from "@/components/learn/learn-library";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";
import { getUserReleaseProjectTags } from "@/lib/corpus/user-release-tags";
import { GENAI_VS_AGENTIC_MODULES } from "@/lib/learn/agentic-curriculum";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { loadPlatformSettings } from "@/lib/platform/settings";
import { isStepValidated } from "@/lib/se/ramp-model";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Learn" };

const AGENTIC_TRACK_MODULE_IDS = new Set(["agentic-ai", "ais-positioning", "customer-discovery"]);

export default async function LearnPage() {
  const { data } = await requireAppAccess("/learn");
  const settings = await loadPlatformSettings(data.currentUser.tenantId ?? undefined);
  const agenticTrackEnabled = isFeatureEnabled(settings.featureFlags, "agentic-ai-track");
  const labEnabled = isFeatureEnabled(settings.featureFlags, "isc-lab");
  const supabase = await createClient();
  const releaseProjectTags =
    supabase && data.currentUser.id ? await getUserReleaseProjectTags(supabase, data.currentUser.id) : [];
  const modules = agenticTrackEnabled
    ? GENAI_VS_AGENTIC_MODULES
    : GENAI_VS_AGENTIC_MODULES.filter((module) => !AGENTIC_TRACK_MODULE_IDS.has(module.id));

  const plan = data.plans.find((item) => item.userId === data.currentUser.id);
  const rampPicks = (plan?.steps ?? []).filter(
    (step) => !step.locked && !isStepValidated(step.status) && Boolean(step.contentAssetId || step.resourceUrl),
  ).length;

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <PageHeader accent="Find it in a minute." eyebrow="Learn" title="Learn." />
      <PageBody className="pb-7">
        <LearnLibrary
          labEnabled={labEnabled}
          modules={modules}
          pathName="GenAI vs Agentic AI"
          rampPicks={rampPicks}
          releaseProjectTags={releaseProjectTags}
        />
      </PageBody>
    </AppShell>
  );
}
