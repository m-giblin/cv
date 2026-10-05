"use client";

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { AdminBody, KpiStrip, LoadingState } from "@/components/admin/admin-ui";
import { PageHeader } from "@/components/ui/page-header";
import {
  adminRouteFromPath,
  type AdminSettingsSectionId,
  type AdminTabId,
} from "@/lib/admin/admin-routes";
import { formatTokenCount, type AiUsageSummary } from "@/lib/ai/settings-shared";
import type { PendingReviewBreakdown } from "@/lib/data/get-pending-review-breakdown";
import type { ActivityLog, Profile, ProfileRole, SeLevel, UserPlan } from "@/lib/types";

const loading = () => <LoadingState />;

const AdminOverview = dynamic(
  () => import("@/components/admin/admin-overview").then((mod) => mod.AdminOverview),
  { loading },
);
const UserManagement = dynamic(
  () => import("@/components/admin/user-management").then((mod) => mod.UserManagement),
  { loading },
);
const BulkUserImport = dynamic(() =>
  import("@/components/admin/bulk-user-import").then((mod) => mod.BulkUserImport),
);
const PlanBuilder = dynamic(() => import("@/components/plans/plan-builder").then((mod) => mod.PlanBuilder), {
  loading,
});
const AssignPlanView = dynamic(
  () => import("@/components/admin/assign-plan-view").then((mod) => mod.AssignPlanView),
  { loading },
);
const CompetencyManagement = dynamic(
  () => import("@/components/admin/competency-management").then((mod) => mod.CompetencyManagement),
  { loading },
);
const ContentAssetManagement = dynamic(
  () => import("@/components/admin/content-asset-management").then((mod) => mod.ContentAssetManagement),
  { loading },
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
const MasterCorpusAdmin = dynamic(
  () => import("@/components/corpus/master-corpus-admin").then((mod) => mod.MasterCorpusAdmin),
  { loading },
);
const AuditLogPanel = dynamic(
  () => import("@/components/admin/audit-log-panel").then((mod) => mod.AuditLogPanel),
  { loading },
);
const AdminSecurityPanel = dynamic(
  () => import("@/components/admin/admin-security-panel").then((mod) => mod.AdminSecurityPanel),
  { loading },
);
const AnalyticsDashboard = dynamic(
  () => import("@/components/admin/analytics-dashboard").then((mod) => mod.AnalyticsDashboard),
  { loading },
);
const ReadinessOutcomeCorrelation = dynamic(() =>
  import("@/components/admin/readiness-outcome-correlation").then((mod) => mod.ReadinessOutcomeCorrelation),
);
const AdminSettingsFeatures = dynamic(
  () => import("@/components/admin/admin-settings-features").then((mod) => mod.AdminSettingsFeatures),
  { loading },
);
const AdminSettingsIntegrationsSection = dynamic(
  () =>
    import("@/components/admin/admin-settings-integrations-section").then((mod) => mod.AdminSettingsIntegrationsSection),
  { loading },
);
const AdminSettingsBasicSection = dynamic(
  () => import("@/components/admin/admin-settings-basic-section").then((mod) => mod.AdminSettingsBasicSection),
  { loading },
);
const AdminSettingsRetentionSection = dynamic(
  () => import("@/components/admin/admin-settings-retention-section").then((mod) => mod.AdminSettingsRetentionSection),
  { loading },
);
const AdminSettingsAiSection = dynamic(
  () => import("@/components/admin/admin-settings-ai-section").then((mod) => mod.AdminSettingsAiSection),
  { loading },
);
const AdminHelpPanel = dynamic(
  () => import("@/components/admin/admin-help-panel").then((mod) => mod.AdminHelpPanel),
  { loading },
);
const AdminReviewsPanel = dynamic(
  () => import("@/components/admin/admin-reviews-panel").then((mod) => mod.AdminReviewsPanel),
  { loading },
);

const LEGACY_TABS: AdminTabId[] = [
  "overview",
  "users",
  "plans",
  "assign",
  "competencies",
  "content-portal",
  "reviews",
  "analytics",
  "ai",
  "corpus",
  "routing",
  "security",
  "audit",
  "help",
  "settings",
];

const SETTINGS_SECTIONS: AdminSettingsSectionId[] = ["flags", "integrations", "ai", "basic", "retention"];

type InitialAdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: ProfileRole;
  level: SeLevel;
  manager_id: string | null;
  created_at: string;
};

const HEADERS: Partial<Record<AdminTabId, { eyebrow: string; title: string }>> = {
  competencies: { eyebrow: "Programs", title: "Competencies" },
  "content-portal": { eyebrow: "Content", title: "Library" },
  corpus: { eyebrow: "Content", title: "Corpus" },
  routing: { eyebrow: "Content", title: "Q&A routing" },
  ai: { eyebrow: "Content", title: "AI & sims" },
  reviews: { eyebrow: "Content", title: "Reviews" },
  analytics: { eyebrow: "Insights", title: "Analytics" },
  audit: { eyebrow: "Insights", title: "Audit log" },
  security: { eyebrow: "Settings", title: "Security" },
  help: { eyebrow: "Overview", title: "Help" },
};

const SETTINGS_TITLES: Record<AdminSettingsSectionId, string> = {
  flags: "Features",
  integrations: "Integrations",
  ai: "AI",
  basic: "General",
  retention: "Data retention",
};

/** Tenant admin console. The path picks the view; each view brings its own header and body. */
export function AdminConsole({
  assignees,
  mentors,
  profiles = [],
  plans = [],
  activity = [],
  pendingReviews = 0,
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = adminRouteFromPath(pathname);
  // The route decides the view; `?tab=` is only read for legacy URLs that have not redirected yet.
  const legacyTab = searchParams.get("tab") as AdminTabId | null;
  const tab: AdminTabId = route?.tab ?? (legacyTab && LEGACY_TABS.includes(legacyTab) ? legacyTab : "overview");
  const legacySection = searchParams.get("section") as AdminSettingsSectionId | null;
  const section: AdminSettingsSectionId =
    route?.section ?? (legacySection && SETTINGS_SECTIONS.includes(legacySection) ? legacySection : "flags");

  // Full-bleed views with their own headers.
  if (tab === "plans") return <PlanBuilder />;
  if (tab === "assign") {
    return <AssignPlanView assignees={assignees} mentors={mentors} plans={plans} profiles={profiles} />;
  }
  if (tab === "settings" && section === "flags") return <AdminSettingsFeatures />;

  let eyebrow = HEADERS[tab]?.eyebrow ?? "";
  let title = HEADERS[tab]?.title ?? "";
  let actions: ReactNode = null;
  let body: ReactNode = null;

  switch (tab) {
    case "overview":
      eyebrow = `${profiles.length} users · last 30 days`;
      title = "Overview";
      body = <AdminOverview activity={activity} pendingReviews={pendingReviews} plans={plans} profiles={profiles} />;
      break;
    case "users":
      eyebrow = `${initialUsers?.length ?? profiles.length} people`;
      title = "People";
      body = (
        <>
          <UserManagement initialUsers={initialUsers} />
          <BulkUserImport />
        </>
      );
      break;
    case "competencies":
      body = <CompetencyManagement />;
      break;
    case "content-portal":
      body = <ContentAssetManagement />;
      break;
    case "reviews":
      body = pendingReviewBreakdown ? (
        <AdminReviewsPanel pendingReviewBreakdown={pendingReviewBreakdown} />
      ) : (
        <p className="text-sm text-muted">Review queue data is not available in this environment.</p>
      );
      break;
    case "analytics":
      actions = (
        <a className="btn-secondary no-underline" href="/api/admin/analytics?format=csv">
          Export CSV
        </a>
      );
      body = (
        <>
          <AnalyticsDashboard />
          <ReadinessOutcomeCorrelation />
        </>
      );
      break;
    case "ai":
      body = (
        <>
          {aiUsage ? (
            <KpiStrip
              items={[
                { label: "Requests · 30d", value: aiUsage.requests30d },
                { label: "Requests today", value: aiUsage.requestsToday },
                { label: "Tokens · 30d", value: formatTokenCount(aiUsage.tokens30d) },
                { label: "Model", value: <span className="text-2xl">{aiUsage.model}</span> },
              ]}
            />
          ) : null}
          <AdminSettingsAiSection />
          <SimulationTemplateManagement />
          <PitchScenarioManagement />
        </>
      );
      break;
    case "corpus":
      body = (
        <>
          <MasterCorpusAdmin />
          <CorpusRoutingAdmin />
        </>
      );
      break;
    case "routing":
      body = <CorpusRoutingAdmin />;
      break;
    case "security":
      body = <AdminSecurityPanel />;
      break;
    case "audit":
      body = <AuditLogPanel profiles={profiles} />;
      break;
    case "help":
      body = <AdminHelpPanel />;
      break;
    case "settings":
      eyebrow = "Settings";
      title = SETTINGS_TITLES[section];
      body =
        section === "integrations" ? (
          <AdminSettingsIntegrationsSection />
        ) : section === "ai" ? (
          <AdminSettingsAiSection />
        ) : section === "basic" ? (
          <AdminSettingsBasicSection />
        ) : (
          <AdminSettingsRetentionSection />
        );
      break;
  }

  return (
    <>
      <PageHeader actions={actions} eyebrow={eyebrow} title={title} />
      <AdminBody>{body}</AdminBody>
    </>
  );
}
