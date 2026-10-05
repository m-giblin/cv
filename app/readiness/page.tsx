import { AppShell } from "@/components/app-shell";
import { CompetencyTable, GapBanner } from "@/components/growth/competency-table";
import { PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";
import { buildCompetencyRows } from "@/lib/se/competency-table";

export const metadata = { title: "Readiness" };

export default async function ReadinessPage() {
  const { data } = await requireAppAccess("/growth");
  const rows = buildCompetencyRows({
    userId: data.currentUser.id,
    coachingCards: data.coachingCards,
    submissions: data.submissions,
    challenges: data.challenges,
  });

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <PageHeader eyebrow="Last 7 scored sims, challenges and reviews" title="Readiness" />
      <div className="flex flex-col gap-[18px] px-[var(--gutter)] pb-7">
        {rows.length > 0 ? (
          <>
            <GapBanner rows={rows} />
            <CompetencyTable rows={rows} />
          </>
        ) : (
          <div className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center text-[15px] leading-[1.5] text-muted">
            No scored evidence yet. Your competencies appear here after your first scored simulation or reviewed
            challenge.
          </div>
        )}
      </div>
    </AppShell>
  );
}
