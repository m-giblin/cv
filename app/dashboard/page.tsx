import Link from "next/link";
import { redirect } from "next/navigation";
import { BrainCircuit, Bot, MessageSquareText, Settings, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { ManagerMetricCard } from "@/components/manager/manager-ui-primitives";
import { SeWorkspaceNorthstar } from "@/components/se/se-workspace-northstar";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireDashboardPageAccess } from "@/lib/auth/require-access";
import { fetchCertificationsForUsers } from "@/lib/data/get-certifications-data";
import { computeCertNextAction } from "@/lib/se/cert-next-action";

export default async function DashboardPage() {
  const { data, source, tier } = await requireDashboardPageAccess();

  if (tier === "manager") {
    redirect("/manager?section=command");
  }

  if (tier === "se") {
    const userCerts = await fetchCertificationsForUsers([data.currentUser.id]);
    const certNextAction = computeCertNextAction(data.currentUser.level, userCerts);
    const approvedCertCount = userCerts.filter((cert) => cert.status === "approved").length;

    return (
      <AppShell currentUser={data.currentUser} notifications={data.notifications}>
        <SEPageLayout bare>
          <DataSourceBanner source={source} />
          <SeWorkspaceNorthstar
            approvedCertCount={approvedCertCount}
            certNextAction={certNextAction}
            data={data}
          />
        </SEPageLayout>
      </AppShell>
    );
  }

  const seCount = data.profiles.filter((profile) => profile.role === "basic_se" || profile.role === "senior_se").length;
  const activePlans = data.plans.filter((plan) => plan.progress < 100).length;
  const openReviews = data.submissions.filter((submission) => submission.status === "submitted").length;
  const coachingCards = data.coachingCards.length;

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <SEPageLayout
        eyebrow="Admin workspace"
        subtitle="Platform oversight — team command, ramp plans, and system configuration."
        title={`Welcome, ${data.currentUser.fullName.split(" ")[0]}`}
      >
        <DataSourceBanner source={source} />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ManagerMetricCard accent="#0071ce" label="Sales engineers" sub="In directory" value={seCount} />
          <ManagerMetricCard accent="#7c3aed" label="Active ramp plans" sub="In progress" value={activePlans} />
          <ManagerMetricCard accent="#d97706" label="Open reviews" sub="Challenge submissions" value={openReviews} />
          <ManagerMetricCard accent="#0891b2" label="Coaching cards" sub="On record" value={coachingCards} />
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link
            className="rounded-xl border border-[#e2eaf5] bg-white p-4 shadow-[0_1px_4px_rgba(0,20,58,0.04)] transition hover:border-[#0071ce]/30 hover:shadow-md"
            href="/manager?section=command"
          >
            <Users className="mb-2 h-5 w-5 text-[#0071ce]" />
            <p className="text-sm font-bold text-[#0a1628]">Team command</p>
            <p className="mt-1 text-xs text-[#64748b]">Roster, inbox, coaching cadence, readiness</p>
          </Link>
          <Link
            className="rounded-xl border border-[#e2eaf5] bg-white p-4 shadow-[0_1px_4px_rgba(0,20,58,0.04)] transition hover:border-[#7c3aed]/30 hover:shadow-md"
            href="/plans"
          >
            <TrendingUp className="mb-2 h-5 w-5 text-[#7c3aed]" />
            <p className="text-sm font-bold text-[#0a1628]">Ramp plans</p>
            <p className="mt-1 text-xs text-[#64748b]">Templates, assignments, step editor</p>
          </Link>
          <Link
            className="rounded-xl border border-[#e2eaf5] bg-white p-4 shadow-[0_1px_4px_rgba(0,20,58,0.04)] transition hover:border-[#cc27b0]/30 hover:shadow-md"
            href="/admin"
          >
            <Settings className="mb-2 h-5 w-5 text-[#cc27b0]" />
            <p className="text-sm font-bold text-[#0a1628]">Admin console</p>
            <p className="mt-1 text-xs text-[#64748b]">Users, content, AI settings, audit</p>
          </Link>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            className="flex items-center gap-3 rounded-xl border border-[#e2eaf5] bg-[#f8fafd] px-4 py-3 text-sm font-semibold text-[#334155] transition hover:bg-white"
            href="/challenges"
          >
            <BrainCircuit className="h-4 w-4 text-[#0071ce]" />
            Challenge library
          </Link>
          <Link
            className="flex items-center gap-3 rounded-xl border border-[#e2eaf5] bg-[#f8fafd] px-4 py-3 text-sm font-semibold text-[#334155] transition hover:bg-white"
            href="/simulations"
          >
            <Bot className="h-4 w-4 text-[#7c3aed]" />
            Simulations
          </Link>
          <Link
            className="flex items-center gap-3 rounded-xl border border-[#e2eaf5] bg-[#f8fafd] px-4 py-3 text-sm font-semibold text-[#334155] transition hover:bg-white"
            href="/manager?section=inbox"
          >
            <MessageSquareText className="h-4 w-4 text-[#d97706]" />
            Action inbox
          </Link>
        </section>
      </SEPageLayout>
    </AppShell>
  );
}
