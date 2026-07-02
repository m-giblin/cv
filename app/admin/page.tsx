import { AppShell } from "@/components/app-shell";
import { AdminConsole } from "@/components/admin/admin-console";
import { DataSourceBanner } from "@/components/data-source-banner";
import { PageHeader } from "@/components/page-hero";
import { getAccessTier } from "@/lib/auth/rbac";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function AdminPage() {
  const { data, source } = await requireAppAccess("/admin");

  const assignees = data.profiles.filter((profile) => getAccessTier(profile.role) === "se");
  const mentors = data.profiles.filter((profile) =>
    ["manager", "mentor", "director", "admin"].includes(profile.role),
  );

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="space-y-8">
        <DataSourceBanner source={source} />

        <PageHeader
          description="People, plans, audit trail, analytics, AI prompts, and content — all in one console."
          eyebrow="Platform admin"
          title="Administration"
          tone="magenta"
        />

        <AdminConsole assignees={assignees} mentors={mentors} />
      </div>
    </AppShell>
  );
}
