import type { SupabaseClient } from "@supabase/supabase-js";
import { ManagerMenteesPanel } from "@/components/manager/manager-mentees-panel";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";
import { fetchMenteeAssignments } from "@/lib/data/fetch-mentor-mentees";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { Database } from "@/lib/database.types";
import type { Profile, ProfileRole, SeLevel } from "@/lib/types";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: ProfileRole;
  level: SeLevel;
  manager_id: string | null;
  tenant_id: string | null;
  avatar_url: string | null;
  created_at: string;
};

/**
 * Mentor home for SEs who mentor others: who they mentor, where each person is in their
 * program(s), and the check-ins waiting on them. Reads with the admin client scoped to
 * mentor_id = the signed-in user, so it works without manager-level row access.
 */
export default async function MentoringPage() {
  const { data } = await requireAppAccess("/mentoring");
  const admin = getTenantAdminClient();
  let mentees: Awaited<ReturnType<typeof fetchMenteeAssignments>> = [];
  if (admin) {
    // An SE-level mentor may not be able to list their mentees' profiles, so read them directly.
    const { data: rows } = await admin
      .from("plan_assignments")
      .select("user_id")
      .eq("mentor_id", data.currentUser.id)
      .neq("status", "completed");
    const menteeIds = [...new Set(((rows ?? []) as { user_id: string }[]).map((row) => row.user_id))];
    const { data: profileRows } = menteeIds.length
      ? await admin
          .from("profiles")
          .select("id, email, full_name, role, level, manager_id, tenant_id, avatar_url, created_at")
          .in("id", menteeIds)
      : { data: [] };
    const menteeProfiles: Profile[] = ((profileRows ?? []) as ProfileRow[]).map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      level: row.level,
      managerId: row.manager_id,
      tenantId: row.tenant_id,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
    }));
    mentees = await fetchMenteeAssignments(
      admin as unknown as SupabaseClient<Database>,
      data.currentUser.id,
      menteeProfiles,
      data.currentUser.tenantId,
    );
  }

  return (
    <>
      <PageHeader
        accent="Who you mentor, and how they're doing."
        eyebrow="Mentoring"
        subtitle="Timeline, progress and overdue work for everyone you mentor, so you can report back to their manager."
        title="Mentoring."
      />
      <PageBody className="pb-7">
        <ManagerMenteesPanel mentees={mentees} />
      </PageBody>
    </>
  );
}
