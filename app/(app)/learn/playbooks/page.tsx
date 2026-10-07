import type { SupabaseClient } from "@supabase/supabase-js";
import { PlaybookLibrary } from "@/components/playbooks/playbook-library";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requirePathAccess } from "@/lib/auth/require-access";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { loadAssignablePeople } from "@/lib/playbooks/assignment-access";
import { loadAssignments } from "@/lib/playbooks/assignments";
import { loadPublishedPlaybooks } from "@/lib/playbooks/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Playbooks · Learn" };

export default async function PlaybooksPage() {
  await requirePathAccess("/learn");
  const [supabase, context] = await Promise.all([createClient(), resolveTenantContext()]);
  const reader = supabase as unknown as SupabaseClient | null;
  const tenantId = context?.tenantId ?? null;
  const userId = context?.userId ?? null;
  // Managers, admins and operators can assign; everyone sees what's assigned to them.
  const canAssign = Boolean(context && tenantId && ["manager", "admin", "super_admin"].includes(context.tier));

  const [library, myAssignments, reads, people] = await Promise.all([
    reader ? loadPublishedPlaybooks(reader) : Promise.resolve({ guides: [], playbooks: [], pitchDrills: {} }),
    tenantId && userId ? loadAssignments(tenantId, { assigneeIds: [userId], includeClosed: true }) : Promise.resolve([]),
    reader && userId ? reader.from("playbook_reads").select("playbook_id").eq("user_id", userId) : Promise.resolve({ data: [] }),
    canAssign && tenantId && userId && context ? loadAssignablePeople(tenantId, userId, context.role) : Promise.resolve([]),
  ]);
  const teamAssignments =
    canAssign && tenantId && people.length
      ? await loadAssignments(tenantId, { assigneeIds: people.map((person) => person.id), includeClosed: true })
      : [];

  return (
    <>
      <PageHeader
        accent="Pitch, ask, handle."
        eyebrow="Learn"
        subtitle="One playbook per capability: the pitch, discovery questions, stories and objection handling, with a 60-second card on top."
        title="Playbooks."
      />
      <PageBody className="pb-7">
        <PlaybookLibrary
          canAssign={canAssign}
          guides={library.guides}
          myAssignments={myAssignments}
          people={people}
          pitchDrills={library.pitchDrills}
          playbooks={library.playbooks}
          readIds={((reads.data ?? []) as { playbook_id: string }[]).map((row) => row.playbook_id)}
          teamAssignments={teamAssignments}
        />
      </PageBody>
    </>
  );
}
