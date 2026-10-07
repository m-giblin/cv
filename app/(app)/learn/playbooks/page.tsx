import type { SupabaseClient } from "@supabase/supabase-js";
import { PlaybookLibrary } from "@/components/playbooks/playbook-library";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requirePathAccess } from "@/lib/auth/require-access";
import { loadPublishedPlaybooks } from "@/lib/playbooks/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Playbooks · Learn" };

export default async function PlaybooksPage() {
  await requirePathAccess("/learn");
  const supabase = await createClient();
  const library = supabase
    ? await loadPublishedPlaybooks(supabase as unknown as SupabaseClient)
    : { guides: [], playbooks: [], pitchDrills: {} };

  return (
    <>
      <PageHeader
        accent="Pitch, ask, handle."
        eyebrow="Learn"
        subtitle="One playbook per capability: the pitch, discovery questions, stories and objection handling, with a 60-second card on top."
        title="Playbooks."
      />
      <PageBody className="pb-7">
        <PlaybookLibrary guides={library.guides} pitchDrills={library.pitchDrills} playbooks={library.playbooks} />
      </PageBody>
    </>
  );
}
