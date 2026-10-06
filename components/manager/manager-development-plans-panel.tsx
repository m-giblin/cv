"use client";

import { format } from "date-fns";
import Link from "next/link";
import { HeaderStat } from "@/components/manager/team-member-bits";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { TableCard, TwoLineCell, rowHighlight, tdCls, thCls } from "@/components/ui/table";
import { currentQuarter } from "@/lib/development/plan-utils";
import type { DevelopmentPlan, GoalStatus, Profile } from "@/lib/types";
import { cn, initials, uniqueProfiles } from "@/lib/utils";

const GOAL_PILL: Record<GoalStatus, { label: string; tone: StatusTone }> = {
  not_started: { label: "Not started", tone: "neutral" },
  on_track: { label: "On track", tone: "blue" },
  at_risk: { label: "At risk", tone: "danger" },
  achieved: { label: "Achieved", tone: "success" },
};

const DAY = 86_400_000;

/** Coaching › Development: each SE's annual development goals and the quarterly attestations due. */
export function ManagerDevelopmentPlansPanel({
  developmentPlans = [],
  org = [],
  onOpenProfile,
}: {
  developmentPlans?: DevelopmentPlan[];
  org?: Profile[];
  onOpenProfile?: (profileId: string) => void;
}) {
  const now = Date.now();
  const quarter = currentQuarter();
  const team = uniqueProfiles(org);
  const planByUser = new Map(developmentPlans.map((plan) => [plan.userId, plan]));

  const due = developmentPlans.flatMap((plan) =>
    plan.goals.flatMap((goal) =>
      goal.quarterlyReviews
        .filter((review) => review.status === "not_started" && new Date(review.dueDate).getTime() <= now + 14 * DAY)
        .map((review) => ({
          plan,
          goal,
          review,
          overdue: new Date(review.dueDate).getTime() < now,
        })),
    ),
  );
  const overdue = due.filter((item) => item.overdue).length;
  const withPlan = team.filter((profile) => planByUser.has(profile.id)).length;

  return (
    <>
      <PageHeader
        accent="Plans that outlast the ramp."
        actions={
          <div className="flex gap-12">
            <HeaderStat label="Plans" value={`${withPlan}/${team.length}`} />
            <HeaderStat label="Attestations due" value={due.length} />
            <HeaderStat label="Overdue" tone={overdue > 0 ? "danger" : "blue"} value={overdue} />
          </div>
        }
        eyebrow={`Coaching, ${quarter}`}
        title="Development."
      />
      <PageBody className="flex flex-col gap-8 pb-7">
        {due.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold text-ink">Quarterly attestations due</h2>
            <TableCard minWidth={640}>
              <caption className="sr-only">Quarterly attestations due in the next 14 days</caption>
              <thead>
                <tr>
                  <th className={thCls} scope="col">Goal</th>
                  <th className={thCls} scope="col">Due</th>
                  <th className={thCls} scope="col">Status</th>
                  <th className={cn(thCls, "text-right")} scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {due.map(({ plan, goal, review, overdue: isOverdue }) => {
                  const person = team.find((profile) => profile.id === plan.userId);
                  return (
                    <tr className={isOverdue ? rowHighlight.danger : undefined} key={review.id}>
                      <td className={tdCls}>
                        <TwoLineCell
                          subline={`${person?.fullName ?? "Team member"}, ${review.quarter}`}
                          title={goal.title}
                        />
                      </td>
                      <td className={cn(tdCls, "whitespace-nowrap text-ink-2")}>
                        {format(new Date(review.dueDate), "EEE, MMM d")}
                      </td>
                      <td className={tdCls}>
                        <StatusPill tone={isOverdue ? "danger" : "warning"}>
                          {isOverdue ? "Overdue" : "Due soon"}
                        </StatusPill>
                      </td>
                      <td className={cn(tdCls, "text-right")}>
                        <Link className="link text-sm" href={`/development?profile=${plan.userId}&review=${review.id}`}>
                          Attest
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableCard>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold text-ink">Goals by SE</h2>
          {team.length === 0 ? (
            <p className="rounded-[14px] border border-line bg-white px-5 py-10 text-center text-[15px] text-muted">
              No one reports to you yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {team.map((profile) => {
                const plan = planByUser.get(profile.id);
                const onTrack =
                  plan?.goals.filter((goal) => goal.overallStatus === "on_track" || goal.overallStatus === "achieved")
                    .length ?? 0;
                return (
                  <article className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-white" key={profile.id}>
                    <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden
                          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-blue-soft text-[13px] font-bold text-blue"
                        >
                          {initials(profile.fullName)}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <button
                            className="truncate text-left text-[15px] font-bold text-ink hover:underline"
                            onClick={() => onOpenProfile?.(profile.id)}
                            type="button"
                          >
                            {profile.fullName}
                          </button>
                          <span className="truncate text-[13px] text-muted">
                            {plan
                              ? `${profile.level}, ${plan.year} plan, ${onTrack} of ${plan.goals.length} on track`
                              : `${profile.level}, no plan yet`}
                          </span>
                        </span>
                      </span>
                      <Link className="link shrink-0 text-sm" href={`/development?profile=${profile.id}`}>
                        {plan ? "Open plan" : "Create plan"}
                      </Link>
                    </header>
                    {plan && plan.goals.length > 0 ? (
                      <ul>
                        {plan.goals.map((goal) => {
                          const review = goal.quarterlyReviews.find(
                            (item) => item.quarter === quarter && item.year === plan.year,
                          );
                          const pill = GOAL_PILL[goal.overallStatus];
                          return (
                            <li
                              className="flex items-start justify-between gap-3 border-t border-divider px-5 py-3 first:border-t-0"
                              key={goal.id}
                            >
                              <span className="flex min-w-0 flex-col">
                                <span className="text-[15px] font-bold text-ink">{goal.title}</span>
                                {review ? (
                                  <span className="text-[13px] text-muted">
                                    {quarter} review: {review.status.replaceAll("_", " ")}
                                  </span>
                                ) : null}
                              </span>
                              <StatusPill className="pt-0.5" tone={pill.tone}>
                                {pill.label}
                              </StatusPill>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="px-5 py-4 text-sm text-muted">
                        {plan ? "This plan has no goals yet." : "Co-create this year's goals on the Development page."}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </PageBody>
    </>
  );
}
