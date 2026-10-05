"use client";

import { format } from "date-fns";
import Link from "next/link";
import { HeaderStat } from "@/components/manager/team-member-bits";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import { currentQuarter } from "@/lib/development/plan-utils";
import type { DevelopmentPlan, GoalStatus, Profile } from "@/lib/types";
import { uniqueProfiles } from "@/lib/utils";

const GOAL_TAG: Record<GoalStatus, { label: string; tone: "neutral" | "success" | "danger" | "blue" }> = {
  not_started: { label: "• Not started", tone: "neutral" },
  on_track: { label: "● On track", tone: "blue" },
  at_risk: { label: "▲ At risk", tone: "danger" },
  achieved: { label: "✓ Achieved", tone: "success" },
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
        actions={
          <div className="flex gap-8">
            <HeaderStat label="Plans" value={`${withPlan}/${team.length}`} />
            <HeaderStat label="Attestations due" value={due.length} />
            <HeaderStat label="Overdue" tone={overdue > 0 ? "danger" : "blue"} value={overdue} />
          </div>
        }
        eyebrow={`Annual development · ${quarter}`}
        title="Development"
      />
      <div className="flex flex-col gap-7 px-[var(--gutter)] pb-8">
        {due.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold text-ink">Quarterly attestations due</h2>
            <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
              {due.map(({ plan, goal, review, overdue: isOverdue }) => {
                const person = team.find((profile) => profile.id === plan.userId);
                return (
                  <li
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-divider px-5 py-3 last:border-b-0"
                    key={review.id}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-ink">{goal.title}</span>
                      <span className="label-mono">
                        {person?.fullName ?? "Team member"} · {review.quarter} · due{" "}
                        {format(new Date(review.dueDate), "dd MMM")}
                      </span>
                    </span>
                    <Tag className="bg-transparent" tone={isOverdue ? "danger" : "blue"}>
                      {isOverdue ? "▲ Overdue" : "● Due soon"}
                    </Tag>
                    <Link className="link text-sm" href={`/development?profile=${plan.userId}&review=${review.id}`}>
                      Attest
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-extrabold text-ink">Goals by SE</h2>
          {team.length === 0 ? (
            <p className="rounded-[14px] border border-line bg-white px-5 py-10 text-center text-[15px] text-muted">
              No one reports to you yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {team.map((profile) => {
                const plan = planByUser.get(profile.id);
                const onTrack =
                  plan?.goals.filter((goal) => goal.overallStatus === "on_track" || goal.overallStatus === "achieved")
                    .length ?? 0;
                return (
                  <article className="flex flex-col rounded-[14px] border border-line bg-white" key={profile.id}>
                    <header className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3">
                      <span className="min-w-0">
                        <button
                          className="block truncate text-left font-bold text-ink hover:underline"
                          onClick={() => onOpenProfile?.(profile.id)}
                          type="button"
                        >
                          {profile.fullName}
                        </button>
                        <span className="label-mono">
                          {profile.level}
                          {plan ? ` · ${plan.year} · ${onTrack}/${plan.goals.length} on track` : " · No plan"}
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
                          const tag = GOAL_TAG[goal.overallStatus];
                          return (
                            <li
                              className="flex items-start justify-between gap-3 border-b border-divider px-5 py-3 last:border-b-0"
                              key={goal.id}
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-bold text-ink">{goal.title}</span>
                                {review ? (
                                  <span className="label-mono">
                                    {quarter} · {review.status.replaceAll("_", " ")}
                                  </span>
                                ) : null}
                              </span>
                              <Tag className="bg-transparent" tone={tag.tone}>
                                {tag.label}
                              </Tag>
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
      </div>
    </>
  );
}
