"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_SETTINGS_HEADERS,
  ADMIN_TAB_HEADERS,
  AdminPageLayout,
} from "@/components/admin/admin-page-layout";
import { AdminOutlineBtn } from "@/components/admin/admin-ui-primitives";
import {
  parseAdminSettingsSection,
  type AdminSettingsSection,
} from "@/components/admin/admin-settings-panel";
import { AdminTabPanel } from "@/components/admin/admin-tabs";
import { useTenantBranding } from "@/components/tenant/tenant-branding-provider";
import { formatTokenCount, type AiUsageSummary } from "@/lib/ai/settings-shared";
import type { PendingReviewBreakdown } from "@/lib/data/get-pending-review-breakdown";
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
const PitchScenarioManagement = dynamic(() =>
  import("@/components/admin/pitch-scenario-management").then((mod) => mod.PitchScenarioManagement),
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
const AdminHelpPanel = dynamic(() =>
  import("@/components/admin/admin-help-panel").then((mod) => mod.AdminHelpPanel),
);
const AdminContentPortalPanel = dynamic(() =>
  import("@/components/admin/admin-content-portal-panel").then((mod) => mod.AdminContentPortalPanel),
);
const AdminReviewsPanel = dynamic(() =>
  import("@/components/admin/admin-reviews-panel").then((mod) => mod.AdminReviewsPanel),
);

const TAB_IDS = [
  "overview",
  "users",
  "plans",
  "competencies",
  "content-portal",
  "reviews",
  "analytics",
  "ai",
  "corpus",
  "routing",
  "audit",
  "help",
  "settings",
] as const;

type AdminTab = (typeof TAB_IDS)[number];

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
  pendingReviewBreakdown,
  aiUsage,
  initialUsers,
}: {
  assignees: Profile[];
  mentors: Profile[];
  profiles?: Profile[];
  plans?: UserPlan[];
  activity?: ActivityLog[];
  pendingReviews?: number;
  pendingReviewBreakdown?: PendingReviewBreakdown;
  aiUsage?: AiUsageSummary | null;
  initialUsers?: InitialAdminUser[];
}) {
  const branding = useTenantBranding();
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

  function selectSettingsSection(next: AdminSettingsSection) {
    setSettingsSection(next);
    router.replace(`/admin?tab=settings&section=${next}`, { scroll: false });
  }

  const header = useMemo(() => {
    if (tab === "settings") {
      return ADMIN_SETTINGS_HEADERS[settingsSection] ?? ADMIN_SETTINGS_HEADERS.flags;
    }
    return ADMIN_TAB_HEADERS[tab] ?? ADMIN_TAB_HEADERS.overview;
  }, [settingsSection, tab]);

  const eyebrow = useMemo(() => {
    if (tab === "overview") {
      const slug = branding.tenantSlug ? `${branding.tenantSlug}.sailpoint.io` : branding.productTagline;
      return `${branding.productName} · ${slug}`;
    }
    if (tab === "users" && initialUsers) {
      return `${initialUsers.length} total · ${branding.productName}`;
    }
    return header.eyebrow;
  }, [branding.productName, branding.productTagline, branding.tenantSlug, header.eyebrow, initialUsers, tab]);

  const headerRight =
    tab === "overview" ? (
      <div className="flex shrink-0 gap-2">
        <AdminOutlineBtn href="/simulations?test=1">Test as SE</AdminOutlineBtn>
        <Link
          className="inline-flex items-center bg-[#00143A] px-3 py-1.5 text-[11px] font-semibold text-white"
          href="/admin?tab=users"
        >
          Manage users →
        </Link>
      </div>
    ) : null;

  return (
    <AdminPageLayout
      eyebrow={eyebrow}
      eyebrowColor={header.eyebrowColor}
      headerRight={headerRight}
      subtitle={header.subtitle}
      title={header.title}
    >
      <div className="handoff-page-enter">
        {overviewAvailable && profiles && plans && activity && typeof pendingReviews === "number" ? (
          <AdminTabPanel active={tab} tab="overview">
            <NorthstarAdminSummary
              activity={activity}
              aiUsage={aiUsage ?? null}
              pendingReviewBreakdown={pendingReviewBreakdown}
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

        <AdminTabPanel active={tab} tab="content-portal">
          <AdminContentPortalPanel />
        </AdminTabPanel>

        <AdminTabPanel active={tab} tab="reviews">
          {pendingReviewBreakdown ? (
            <AdminReviewsPanel pendingReviewBreakdown={pendingReviewBreakdown} />
          ) : (
            <p className="text-sm text-[#6B6860]">Review queue data is not available in this environment.</p>
          )}
        </AdminTabPanel>

        <AdminTabPanel active={tab} tab="analytics">
          <AnalyticsDashboard />
          <p className="mt-4 text-sm">
            <a className="font-semibold text-[#0033a1] hover:underline" href="/api/admin/analytics?format=csv">
              Export analytics CSV
            </a>
          </p>
        </AdminTabPanel>

        <AdminTabPanel active={tab} tab="ai">
          <div className="space-y-6">
            {aiUsage ? (
              <section className="grid gap-px border border-[#E2DFD9] bg-[#E2DFD9] sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Requests (30d)", value: String(aiUsage.requests30d), color: "#D4810A" },
                  { label: "Requests today", value: String(aiUsage.requestsToday), color: "#0A6E45" },
                  { label: "Tokens (30d)", value: formatTokenCount(aiUsage.tokens30d), color: "#CC27B0" },
                  { label: "Active model", value: aiUsage.model, color: "#0071CE" },
                ].map((kpi) => (
                  <div className="bg-white p-[14px_16px]" key={kpi.label}>
                    <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8]">{kpi.label}</p>
                    <p className="truncate font-mono text-[34px] font-normal leading-none text-[#0D0E12]">{kpi.value}</p>
                  </div>
                ))}
              </section>
            ) : null}
            <AdminSettingsAiSection />
            <SimulationTemplateManagement />
            <PitchScenarioManagement />
          </div>
        </AdminTabPanel>

        <AdminTabPanel active={tab} tab="corpus">
          <div className="space-y-8">
            <MasterCorpusAdmin />
            <CorpusRoutingAdmin />
          </div>
        </AdminTabPanel>

        <AdminTabPanel active={tab} tab="routing">
          <CorpusRoutingAdmin />
        </AdminTabPanel>

        <AdminTabPanel active={tab} tab="audit">
          <AuditLogPanel profiles={profiles ?? []} />
        </AdminTabPanel>

        <AdminTabPanel active={tab} tab="help">
          <AdminHelpPanel />
        </AdminTabPanel>

        <AdminTabPanel active={tab} tab="settings">
          <AdminSettingsPanel onSectionChange={selectSettingsSection} section={settingsSection} />
        </AdminTabPanel>
      </div>
    </AdminPageLayout>
  );
}
