"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminTab, AdminTabPanel, AdminTabs } from "@/components/admin/admin-tabs";
import type { AiUsageSummary } from "@/lib/ai/settings-shared";
import type { ActivityLog, Profile, ProfileRole, SeLevel, UserPlan } from "@/lib/types";

const NorthstarAdminSummary = dynamic(() =>
  import("@/components/admin/northstar-admin-summary").then((mod) => mod.NorthstarAdminSummary),
);
const UserManagement = dynamic(() =>
  import("@/components/admin/user-management").then((mod) => mod.UserManagement),
);
const BulkUserImport = dynamic(() =>
  import("@/components/admin/bulk-user-import").then((mod) => mod.BulkUserImport),
);
const PlanManagementPanel = dynamic(() =>
  import("@/components/plans/plan-management").then((mod) => mod.PlanManagementPanel),
);
const CompetencyManagement = dynamic(() =>
  import("@/components/admin/competency-management").then((mod) => mod.CompetencyManagement),
);
const SimulationTemplateManagement = dynamic(() =>
  import("@/components/admin/simulation-template-management").then((mod) => mod.SimulationTemplateManagement),
);
const CorpusRoutingAdmin = dynamic(() =>
  import("@/components/corpus/corpus-routing-admin").then((mod) => mod.CorpusRoutingAdmin),
);
const MasterCorpusAdmin = dynamic(() =>
  import("@/components/corpus/master-corpus-admin").then((mod) => mod.MasterCorpusAdmin),
);
const AuditLogPanel = dynamic(() => import("@/components/admin/audit-log-panel").then((mod) => mod.AuditLogPanel));
const AnalyticsDashboard = dynamic(() =>
  import("@/components/admin/analytics-dashboard").then((mod) => mod.AnalyticsDashboard),
);
const AdminSettingsPanel = dynamic(() =>
  import("@/components/admin/admin-settings-panel").then((mod) => mod.AdminSettingsPanel),
);
const AdminSettingsAiSection = dynamic(() =>
  import("@/components/admin/admin-settings-ai-section").then((mod) => mod.AdminSettingsAiSection),
);

const TAB_IDS: AdminTab[] = [
  "overview",
  "users",
  "plans",
  "competencies",
  "analytics",
  "ai",
  "corpus",
  "routing",
  "audit",
  "settings",
];

type InitialAdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: ProfileRole;
  level: SeLevel;
  manager_id: string | null;
  created_at: string;
};

function hasOverviewData(
  profiles?: Profile[],
  plans?: UserPlan[],
  activity?: ActivityLog[],
  pendingReviews?: number,
): boolean {
  return Boolean(profiles && plans && activity && typeof pendingReviews === "number");
}

function parseAdminTab(value: string | null, overviewAvailable: boolean): AdminTab {
  if (value && TAB_IDS.includes(value as AdminTab)) {
    return value as AdminTab;
  }
  return overviewAvailable ? "overview" : "users";
}

export function AdminConsole({
  assignees,
  mentors,
  profiles,
  plans,
  activity,
  pendingReviews,
  aiUsage,
  initialUsers,
}: {
  assignees: Profile[];
  mentors: Profile[];
  profiles?: Profile[];
  plans?: UserPlan[];
  activity?: ActivityLog[];
  pendingReviews?: number;
  aiUsage?: AiUsageSummary | null;
  initialUsers?: InitialAdminUser[];
}) {
  const overviewAvailable = hasOverviewData(profiles, plans, activity, pendingReviews);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>(() => parseAdminTab(searchParams.get("tab"), overviewAvailable));

  useEffect(() => {
    setTab(parseAdminTab(searchParams.get("tab"), overviewAvailable));
  }, [overviewAvailable, searchParams]);

  function selectTab(next: AdminTab) {
    setTab(next);
    router.replace(`/admin?tab=${next}`, { scroll: false });
  }

  return (
    <div>
      <AdminTabs active={tab} onChange={selectTab} />

      {overviewAvailable && profiles && plans && activity && typeof pendingReviews === "number" ? (
        <AdminTabPanel active={tab} tab="overview">
          <NorthstarAdminSummary
            activity={activity}
            aiUsage={aiUsage ?? null}
            onViewAudit={() => selectTab("audit")}
            pendingReviews={pendingReviews}
            plans={plans}
            profiles={profiles}
          />
        </AdminTabPanel>
      ) : null}

      <AdminTabPanel active={tab} tab="users">
        <div className="space-y-6">
          <UserManagement initialUsers={initialUsers} />
          <BulkUserImport />
        </div>
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="plans">
        <PlanManagementPanel assignees={assignees} mentors={mentors} plans={plans ?? []} profiles={profiles ?? []} />
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="competencies">
        <CompetencyManagement />
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="analytics">
        <AnalyticsDashboard />
        <p className="mt-4 text-sm">
          <a
            className="font-semibold text-[#0033a1] hover:underline"
            href="/api/admin/analytics?format=csv"
          >
            Export analytics CSV
          </a>
        </p>
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="ai">
        <div className="space-y-6">
          <AdminSettingsAiSection />
          <SimulationTemplateManagement />
        </div>
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="corpus">
        <MasterCorpusAdmin />
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="routing">
        <CorpusRoutingAdmin />
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="audit">
        <AuditLogPanel profiles={profiles ?? []} />
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="settings">
        <AdminSettingsPanel />
      </AdminTabPanel>
    </div>
  );
}
