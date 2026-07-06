import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AdminConsole } from "@/components/admin/admin-console";
import { loadAiUsageSummary } from "@/lib/ai/settings";
import { getAccessTier } from "@/lib/auth/rbac";
import { requireAdminPageAccess } from "@/lib/auth/require-access";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const adminClient = createAdminClient();
  const [{ data }, aiUsage] = await Promise.all([
    requireAdminPageAccess(),
    adminClient ? loadAiUsageSummary(adminClient) : Promise.resolve(null),
  ]);

  const assignees = data.profiles.filter((profile) => getAccessTier(profile.role) === "se");
  const mentors = data.profiles.filter((profile) =>
    ["manager", "mentor", "director", "admin"].includes(profile.role),
  );

  const pendingReviews = data.plans.reduce(
    (count, plan) => count + plan.steps.filter((step) => step.status === "submitted").length,
    0,
  );

  const initialUsers = data.profiles.map((profile) => ({
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    role: profile.role,
    level: profile.level,
    manager_id: profile.managerId,
    created_at: profile.createdAt,
  }));

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="space-y-6">
        <Suspense fallback={<div className="text-sm text-stone-500">Loading admin console…</div>}>
          <AdminConsole
            activity={data.activity}
            aiUsage={aiUsage}
            assignees={assignees}
            initialUsers={initialUsers}
            mentors={mentors}
            pendingReviews={pendingReviews}
            plans={data.plans}
            profiles={data.profiles}
          />
        </Suspense>
      </div>
    </AppShell>
  );
}
