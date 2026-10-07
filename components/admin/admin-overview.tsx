"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KpiStrip } from "@/components/admin/admin-ui";
import { DefinitionCard } from "@/components/ui/editorial";
import { MainWithRail, PageBody, PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getAccessTier } from "@/lib/auth/rbac";
import type { ActivityLog, Profile, UserPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

const ACTIVITY_ROWS: { eventTypes: ActivityLog["eventType"][]; label: string }[] = [
  { eventTypes: ["simulation_completed"], label: "Simulations run" },
  { eventTypes: ["challenge_submitted"], label: "Challenges submitted" },
  { eventTypes: ["deal_prep_completed"], label: "Deal prep briefs" },
  { eventTypes: ["flight_check_completed"], label: "Market Pulse quizzes" },
  { eventTypes: ["pitch_submitted"], label: "Pitches recorded" },
];

type SetupStatus = { sso: boolean | null; competencies: number | null; gong: boolean | null };

type SetupRow = {
  id: string;
  done: boolean | null;
  title: string;
  detail?: string;
  action: { label: string; href: string };
};

function planProgress(plan: UserPlan): number {
  if (plan.steps.length === 0) return plan.progress ?? 0;
  return Math.round((plan.steps.filter((step) => step.status === "reviewed").length / plan.steps.length) * 100);
}

function namesSummary(names: string[]): string {
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

/** Tenant admin Overview (handoff 11a): setup card, four-stat strip, and the "enablement" definition card. */
export function AdminOverview({
  profiles,
  plans,
  activity,
  pendingReviews,
}: {
  profiles: Profile[];
  plans: UserPlan[];
  activity: ActivityLog[];
  pendingReviews: number;
}) {
  const [status, setStatus] = useState<SetupStatus>({ sso: null, competencies: null, gong: null });

  useEffect(() => {
    void (async () => {
      const [security, competencies, integrations] = await Promise.all([
        fetch("/api/admin/security").catch(() => null),
        fetch("/api/admin/competencies").catch(() => null),
        fetch("/api/integrations/status").catch(() => null),
      ]);
      const next: SetupStatus = { sso: null, competencies: null, gong: null };
      if (security?.ok) {
        const body = (await security.json()) as { sso: { enabled: boolean } | null };
        next.sso = Boolean(body.sso?.enabled);
      }
      if (competencies?.ok) {
        const body = (await competencies.json()) as { competencies?: unknown[] };
        next.competencies = body.competencies?.length ?? 0;
      }
      if (integrations?.ok) {
        const body = (await integrations.json()) as { configured?: { gong?: boolean } };
        next.gong = Boolean(body.configured?.gong);
      }
      setStatus(next);
    })();
  }, []);

  const ses = useMemo(() => profiles.filter((profile) => getAccessTier(profile.role) === "se"), [profiles]);
  const activePlans = plans.filter((plan) => plan.status !== "completed");
  const withPlan = new Set(activePlans.map((plan) => plan.userId));
  const withoutPlan = ses.filter((profile) => !withPlan.has(profile.id));

  const since = Date.now() - 30 * DAY_MS;
  const recent = activity.filter((item) => new Date(item.createdAt).getTime() >= since);
  const activeSes = new Set(recent.map((item) => item.userId).filter((id) => ses.some((se) => se.id === id))).size;
  const avgProgress = activePlans.length
    ? Math.round(activePlans.reduce((sum, plan) => sum + planProgress(plan), 0) / activePlans.length)
    : 0;
  const activityCounts = ACTIVITY_ROWS.map((row) => ({
    ...row,
    value: recent.filter((item) => row.eventTypes.includes(item.eventType)).length,
  }));

  const rows: SetupRow[] = [
    {
      id: "sso",
      done: status.sso,
      title: "Single sign-on",
      detail: status.sso ? "Connected" : "Lets SEs sign in with your identity provider",
      action: { label: "Security", href: "/admin/settings/security" },
    },
    {
      id: "users",
      done: ses.length > 0,
      title: ses.length > 0 ? "People imported" : "Import your SEs",
      detail: ses.length > 0 ? `${profiles.length} ${profiles.length === 1 ? "person" : "people"} in the tenant` : "Add people by CSV or one at a time",
      action: { label: "Import people", href: "/admin/people" },
    },
    {
      id: "competencies",
      done: status.competencies === null ? null : status.competencies > 0,
      title: status.competencies ? "Competencies defined" : "Define competencies",
      detail: status.competencies
        ? `${status.competencies} ${status.competencies === 1 ? "competency" : "competencies"}`
        : "What readiness is measured against",
      action: { label: "Define competencies", href: "/admin/programs/competencies" },
    },
    {
      id: "plans",
      done: ses.length > 0 && withoutPlan.length === 0,
      title:
        withoutPlan.length > 0
          ? `${withoutPlan.length} SE${withoutPlan.length === 1 ? " has" : "s have"} no ramp plan`
          : "Every SE has a ramp plan",
      detail: withoutPlan.length > 0 ? namesSummary(withoutPlan.map((profile) => profile.fullName)) : "Assigned from Programs",
      action: { label: "Assign plans", href: "/admin/programs/assign" },
    },
    {
      id: "integrations",
      done: status.gong,
      title: "Connect Gong",
      detail: status.gong ? "Connected" : "Gives deal prep real call notes",
      action: { label: "Integrations", href: "/admin/settings/integrations" },
    },
  ];

  const loadingSetup = rows.some((row) => row.done === null);
  const doneCount = rows.filter((row) => row.done).length;
  const currentIndex = rows.findIndex((row) => row.done === false);
  const complete = !loadingSetup && doneCount === rows.length;

  return (
    <>
      <PageHeader
        accent={complete ? "All set up." : "Almost set up."}
        eyebrow={`${profiles.length} ${profiles.length === 1 ? "person" : "people"}, last 30 days`}
        title="Overview."
      />
      <PageBody className="pb-10">
        <MainWithRail rail={<EnablementCard rows={activityCounts} />}>
          {complete ? null : (
            <section aria-labelledby="setup-title" className="overflow-hidden rounded-[14px] border border-line bg-white">
              <div className="flex flex-col gap-2.5 border-b border-line px-[22px] py-[18px]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-extrabold text-ink" id="setup-title">
                    Setup
                  </h2>
                  <span className="text-sm text-muted">
                    {loadingSetup ? (
                      "Checking what is done…"
                    ) : (
                      <>
                        <b className="font-bold text-ink">
                          {doneCount} of {rows.length}
                        </b>{" "}
                        done. This card hides when you finish.
                      </>
                    )}
                  </span>
                </div>
                <div aria-hidden className="flex gap-1.5">
                  {rows.map((row, index) => (
                    <span
                      className={cn(
                        "h-2 flex-1 rounded-[2px]",
                        row.done ? "bg-blue" : index === currentIndex ? "bg-signal" : "bg-track",
                      )}
                      key={row.id}
                    />
                  ))}
                </div>
              </div>
              <ol>
                {rows.map((row, index) => {
                  const current = index === currentIndex;
                  return (
                    <li
                      aria-current={current ? "step" : undefined}
                      className={cn(
                        "grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 border-t border-divider px-[22px] py-3.5 first:border-t-0",
                        current && "bg-signal-soft",
                      )}
                      key={row.id}
                    >
                      <span
                        className={cn(
                          "num text-[22px] font-extrabold",
                          row.done ? "text-blue" : current ? "text-ink" : "text-faint",
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="flex min-w-0 flex-col gap-[3px]">
                        <span className="text-[15px] font-bold text-ink">{row.title}</span>
                        {row.detail ? <span className="truncate text-[13px] text-muted">{row.detail}</span> : null}
                      </span>
                      <span className="justify-self-end">
                        {row.done === null ? (
                          <StatusPill tone="neutral">Checking</StatusPill>
                        ) : row.done ? (
                          <StatusPill tone="success">Done</StatusPill>
                        ) : current ? (
                          <Link className="btn-primary inline-block px-[18px] py-2 text-sm whitespace-nowrap no-underline" href={row.action.href}>
                            {row.action.label}
                          </Link>
                        ) : (
                          <Link className="link text-sm" href={row.action.href}>
                            {row.action.label}
                          </Link>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <KpiStrip
            items={[
              { label: "Active SEs", value: activeSes, suffix: `/${ses.length}`, href: "/admin/people" },
              { label: "Plan progress", value: avgProgress, suffix: "%", href: "/admin/programs" },
              { label: "Open reviews", value: pendingReviews, href: "/admin/content/reviews" },
              { label: "Sims run", value: activityCounts[0]?.value ?? 0, href: "/admin/insights" },
            ]}
          />
        </MainWithRail>
      </PageBody>
    </>
  );
}

function EnablementCard({ rows }: { rows: { label: string; value: number }[] }) {
  return (
    <DefinitionCard
      inner={
        <dl className="flex flex-col">
          {rows.map((row, index) => (
            <div
              className={cn("flex items-center justify-between py-[9px] text-sm", index > 0 && "border-t border-navy-line")}
              key={row.label}
            >
              <dt className="text-on-navy">{row.label}</dt>
              <dd className="num text-[17px] font-extrabold text-signal">{row.value}</dd>
            </div>
          ))}
        </dl>
      }
      link={
        <Link className="link text-[15px]" href="/admin/insights">
          Full analytics in Insights
        </Link>
      }
      partOfSpeech="noun, ops"
      word="enablement"
    >
      Getting a new SE from first login to first solo call, and keeping everyone else sharp after. Here is the last 30 days:
    </DefinitionCard>
  );
}
