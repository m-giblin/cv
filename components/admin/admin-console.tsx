"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminTabPageHeader } from "@/components/admin/admin-tab-page-header";
import {
  parseAdminSettingsSection,
  type AdminSettingsSection,
} from "@/components/admin/admin-settings-panel";
import { AdminTab, AdminTabPanel, AdminTabs } from "@/components/admin/admin-tabs";
import { formatTokenCount, type AiUsageSummary } from "@/lib/ai/settings-shared";
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
  const [settingsSection, setSettingsSection] = useState<AdminSettingsSection>(() =>
    parseAdminSettingsSection(searchParams.get("section")),
  );

  useEffect(() => {
    setTab(parseAdminTab(searchParams.get("tab"), overviewAvailable));
    setSettingsSection(parseAdminSettingsSection(searchParams.get("section")));
  }, [overviewAvailable, searchParams]);

  function selectTab(next: AdminTab) {
    setTab(next);
    if (next === "settings") {
      router.replace(`/admin?tab=settings&section=${settingsSection}`, { scroll: false });
      return;
    }
    router.replace(`/admin?tab=${next}`, { scroll: false });
  }

  function selectSettingsSection(next: AdminSettingsSection) {
    setSettingsSection(next);
    router.replace(`/admin?tab=settings&section=${next}`, { scroll: false });
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
          <AdminTabPageHeader
            subtitle="AI provider configuration, simulation templates, and global AI toggles."
            title="AI & Sims"
          />
          {aiUsage ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Requests (30d)", value: String(aiUsage.requests30d), border: "#0071ce" },
                { label: "Requests today", value: String(aiUsage.requestsToday), border: "#10b981" },
                { label: "Tokens (30d)", value: formatTokenCount(aiUsage.tokens30d), border: "#cc27b0" },
                { label: "Active model", value: aiUsage.model, border: "#f59e0b" },
              ].map((kpi) => (
                <div
                  className="rounded-xl border border-[#e2eaf5] bg-white p-[14px_16px]"
                  key={kpi.label}
                  style={{ borderLeftWidth: 3, borderLeftColor: kpi.border }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#94a3b8]">{kpi.label}</p>
                  <p className="mt-1 truncate font-display text-[22px] font-extrabold leading-none text-[#0a1628]">
                    {kpi.value}
                  </p>
                </div>
              ))}
            </section>
          ) : null}
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
        <AdminSettingsPanel onSectionChange={selectSettingsSection} section={settingsSection} />
      </AdminTabPanel>
    </div>
  );
}
