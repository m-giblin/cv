"use client";

import Link from "next/link";
import { QuestionBankAdmin } from "@/components/question-bank/question-bank-admin";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { AdminBody, LoadingState } from "@/components/admin/admin-ui";
import { AdminSettingsHeader } from "@/components/admin/admin-settings-header";
import { PageHeader } from "@/components/ui/page-header";
import {
  adminRouteFromPath,
  type AdminSettingsSectionId,
  type AdminTabId,
} from "@/lib/admin/admin-routes";
import type { PracticeUsage } from "@/lib/admin/practice-library";
import type { AiUsageSummary } from "@/lib/ai/settings-shared";
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
const ProgramsWorkspace = dynamic(
  () => import("@/components/programs/programs-workspace").then((mod) => mod.ProgramsWorkspace),
  { loading },
);
const ReleaseCoursesPanel = dynamic(
  () => import("@/components/corpus/release-courses-panel").then((mod) => mod.ReleaseCoursesPanel),
  { loading },
);
const ReleaseLaunchAnalytics = dynamic(
  () => import("@/components/corpus/release-launch-analytics").then((mod) => mod.ReleaseLaunchAnalytics),
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
const PracticeLibrary = dynamic(
  () => import("@/components/admin/practice-library").then((mod) => mod.PracticeLibrary),
  { loading },
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
  "practice",
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

const HEADERS: Partial<Record<AdminTabId, { eyebrow: string; title: string; subtitle?: string }>> = {
  competencies: {
    eyebrow: "Programs",
    title: "Competencies",
    subtitle: "What readiness is measured against. Plans, practice and certification gates all point here.",
  },
  "content-portal": {
    eyebrow: "Content",
    title: "Library",
    subtitle: "Modules, battle cards and guides SEs find in Learn and plans link to as steps.",
  },
  corpus: { eyebrow: "Content", title: "Corpus", subtitle: "The source material behind answers, and where unanswered questions go." },
  routing: { eyebrow: "Content", title: "Q&A routing" },
  reviews: { eyebrow: "Content", title: "Reviews", subtitle: "Work waiting on a reviewer across the tenant." },
  analytics: { eyebrow: "Insights", title: "Analytics", subtitle: "How SEs are ramping, and whether readiness tracks with deals." },
  audit: { eyebrow: "Insights", title: "Audit log", subtitle: "Who changed what, and when." },
  help: { eyebrow: "Overview", title: "Help", subtitle: "Ask the platform team, and see what you asked before." },
};

/** Tenant admin console. The path picks the view; each view brings its own header and body. */
const PROGRAM_VIEWS = [
  { id: "onboarding", label: "Onboarding programs" },
  { id: "release", label: "Release training" },
  { id: "questions", label: "Question bank" },
] as const;

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
  practiceUsage = null,
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
  practiceUsage?: PracticeUsage | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = adminRouteFromPath(pathname);
  // The route decides the view; `?tab=` is only read for legacy URLs that have not redirected yet.
  const legacyTab = searchParams.get("tab") as AdminTabId | null;
  const resolved: AdminTabId = route?.tab ?? (legacyTab && LEGACY_TABS.includes(legacyTab) ? legacyTab : "overview");
  const tab: AdminTabId = resolved === "ai" ? "practice" : resolved;
  const legacySection = searchParams.get("section") as AdminSettingsSectionId | null;
  const section: AdminSettingsSectionId =
    route?.section ?? (legacySection && SETTINGS_SECTIONS.includes(legacySection) ? legacySection : "flags");

  // Full-bleed views with their own headers.
  if (tab === "plans" || tab === "assign") {
    // One job per tab instead of three tools stacked on one long page.
    const view = PROGRAM_VIEWS.some((item) => item.id === searchParams.get("view")) ? searchParams.get("view") : "onboarding";
    return (
      <>
        <nav aria-label="Programs" className="flex gap-1.5 border-b border-line px-[var(--page-pad-x)] pt-6 max-sm:px-4">
          {PROGRAM_VIEWS.map((item) => (
            <Link
              aria-current={view === item.id ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 pb-2.5 text-[15px] ${
                view === item.id ? "border-blue font-bold text-blue" : "border-transparent text-muted hover:text-ink"
              }`}
              href={item.id === "onboarding" ? pathname : `${pathname}?view=${item.id}`}
              key={item.id}
              scroll={false}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {view === "release" ? (
          <section className="flex flex-col gap-6 px-[var(--page-pad-x)] pt-6 pb-10 max-sm:px-4">
            <ReleaseCoursesPanel assignees={assignees} />
            <ReleaseLaunchAnalytics />
          </section>
        ) : view === "questions" ? (
          <section className="px-[var(--page-pad-x)] pt-6 pb-10 max-sm:px-4">
            <QuestionBankAdmin />
          </section>
        ) : (
          <ProgramsWorkspace mentors={mentors} mode="admin" people={assignees} plans={plans} />
        )}
      </>
    );
  }
  if (tab === "practice") return <PracticeLibrary aiUsage={aiUsage ?? null} people={assignees} usage={practiceUsage} />;
  if (tab === "overview") {
    return <AdminOverview activity={activity} pendingReviews={pendingReviews} plans={plans} profiles={profiles} />;
  }
  if (tab === "settings" && section === "flags") return <AdminSettingsFeatures />;
  if (tab === "settings" || tab === "security") {
    const active = tab === "security" ? "security" : section;
    return (
      <>
        <AdminSettingsHeader active={active} />
        <AdminBody>
          {tab === "security" ? (
            <AdminSecurityPanel />
          ) : section === "integrations" ? (
            <AdminSettingsIntegrationsSection />
          ) : section === "ai" ? (
            <AdminSettingsAiSection usage={aiUsage ?? null} />
          ) : section === "basic" ? (
            <AdminSettingsBasicSection />
          ) : (
            <AdminSettingsRetentionSection />
          )}
        </AdminBody>
      </>
    );
  }

  const eyebrow = HEADERS[tab]?.eyebrow ?? "";
  let title = HEADERS[tab]?.title ?? "";
  const subtitle = HEADERS[tab]?.subtitle;
  let actions: ReactNode = null;
  let body: ReactNode = null;

  switch (tab) {
    case "users":
      title = "People";
      body = (
        <>
          <UserManagement initialUsers={initialUsers} />
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
          Export as CSV
        </a>
      );
      body = (
        <>
          <AnalyticsDashboard />
          <ReadinessOutcomeCorrelation />
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
    case "audit":
      body = <AuditLogPanel profiles={profiles} />;
      break;
    case "help":
      body = <AdminHelpPanel />;
      break;
  }

  return (
    <>
      <PageHeader
        actions={actions}
        eyebrow={tab === "users" ? `${initialUsers?.length ?? profiles.length} people` : eyebrow}
        subtitle={tab === "users" ? "Everyone in the tenant, their role, and who they report to." : subtitle}
        title={title}
      />
      <AdminBody>{body}</AdminBody>
    </>
  );
}
