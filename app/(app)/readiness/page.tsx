import { CompetencyTable, GapBanner } from "@/components/growth/competency-table";
import { ReadinessScoreCard } from "@/components/growth/readiness-score-card";
import { ReadinessTabs } from "@/components/growth/readiness-tabs";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { computeSeReadinessScore } from "@/lib/readiness/compute-score";
import { buildCompetencyRows } from "@/lib/se/competency-table";
import { feedbackItemCount } from "@/lib/se/readiness-tabs";

export const metadata = { title: "Readiness" };

export default async function ReadinessPage() {
  const { data } = await requireAppAccess("/growth");
  const rows = buildCompetencyRows({
    userId: data.currentUser.id,
    coachingCards: data.coachingCards,
    submissions: data.submissions,
    challenges: data.challenges,
  });

  // Same inputs as the manager's readiness score, so both see one number.
  const me = data.currentUser.id;
  const admin = getTenantAdminClient();
  const [certs, lab] = admin
    ? await Promise.all([
        admin.from("readiness_certifications").select("id", { count: "exact", head: true }).eq("user_id", me).eq("status", "approved"),
        admin
          .from("isc_lab_interactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", me)
          .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
      ])
    : [{ count: 0 }, { count: 0 }];
  const plan = data.plans.find((item) => item.userId === me);
  const breakdown = computeSeReadinessScore({
    plan,
    coachingCards: data.coachingCards.filter((card) => card.userId === me),
    approvedCertCount: certs.count ?? 0,
    labSessions30d: lab.count ?? 0,
  });

  return (
    <>
      <PageHeader accent="Where you stand today." eyebrow="Readiness" title="Readiness." />
      <PageBody className="flex flex-col gap-[22px] pb-7">
        <ReadinessTabs feedbackCount={feedbackItemCount(data)} value="competencies" />
        <ReadinessScoreCard breakdown={breakdown} onRamp={Boolean(plan && plan.status !== "completed")} />
        {rows.length > 0 ? (
          <>
            <GapBanner rows={rows} />
            <CompetencyTable rows={rows} />
          </>
        ) : (
          <div className="rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] leading-[1.5] text-muted">
            No competency scores yet. Each competency appears here after your first scored simulation or reviewed
            challenge for it.
          </div>
        )}
      </PageBody>
    </>
  );
}
