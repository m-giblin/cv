"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KpiStrip } from "@/components/admin/admin-ui";
import { Tag } from "@/components/ui/tag";
import { getAccessTier } from "@/lib/auth/rbac";
import type { ActivityLog, Profile, UserPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

const ACTIVITY_ROWS: { eventTypes: ActivityLog["eventType"][]; label: string }[] = [
  { eventTypes: ["simulation_completed"], label: "Simulations run" },
  { eventTypes: ["challenge_submitted"], label: "Challenges submitted" },
  { eventTypes: ["deal_prep_completed"], label: "Deal prep briefs" },
  { eventTypes: ["flight_check_completed"], label: "Market Pulse quizzes" },
  { eventTypes: ["coaching_card_reviewed", "pitch_submitted"], label: "Coaching and pitch" },
];

type SetupStatus = { sso: boolean | null; competencies: number | null; gong: boolean | null };

type SetupRow = {
  id: string;
  done: boolean | null;
  runwayLabel: string;
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

/** Tenant admin Overview (handoff 11a): setup runway, four KPIs, 30-day activity rail. */
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
      runwayLabel: "SSO",
      title: "SSO configured",
      action: { label: "Security", href: "/admin/settings/security" },
    },
    {
      id: "users",
      done: ses.length > 0,
      runwayLabel: `Users · ${ses.length}`,
      title: ses.length > 0 ? `Users imported · ${profiles.length}` : "Import your SEs",
      action: { label: "Import users", href: "/admin/people" },
    },
    {
      id: "competencies",
      done: status.competencies === null ? null : status.competencies > 0,
      runwayLabel: status.competencies ? `Competencies · ${status.competencies}` : "Competencies",
      title: status.competencies ? `Competencies defined · ${status.competencies}` : "Define competencies",
      action: { label: "Define competencies", href: "/admin/programs/competencies" },
    },
    {
      id: "plans",
      done: ses.length > 0 && withoutPlan.length === 0,
      runwayLabel: "Ramp plans",
      title:
        withoutPlan.length > 0
          ? `${withoutPlan.length} SE${withoutPlan.length === 1 ? " has" : "s have"} no ramp plan`
          : "Every SE has a ramp plan",
      detail: withoutPlan.length > 0 ? namesSummary(withoutPlan.map((profile) => profile.fullName)) : undefined,
      action: { label: "Assign plans", href: "/admin/programs/assign" },
    },
    {
      id: "integrations",
      done: status.gong,
      runwayLabel: "Integrations",
      title: "Connect Gong for deal prep call intel",
      action: { label: "Integrations", href: "/admin/settings/integrations" },
    },
  ];

  const loadingSetup = rows.some((row) => row.done === null);
  const doneCount = rows.filter((row) => row.done).length;
  const currentIndex = rows.findIndex((row) => row.done === false);
  const complete = !loadingSetup && doneCount === rows.length;

  return (
    <div className="grid gap-7 min-[1100px]:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        {complete ? null : (
          <section
            aria-labelledby="setup-runway-title"
            className="overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-white"
          >
            <div className="flex flex-col gap-2.5 border-b-[1.5px] border-ink px-5 pt-4 pb-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-extrabold text-ink" id="setup-runway-title">
                  Setup runway
                </h2>
                <span className="font-mono text-xs text-muted uppercase">
                  {loadingSetup ? "Checking…" : `${doneCount} of ${rows.length}`} · Hidden when complete
                </span>
              </div>
              <div aria-hidden className="flex gap-1.5">
                {rows.map((row, index) => (
                  <span
                    className={cn(
                      "h-3 flex-1 rounded-[4px]",
                      row.done
                        ? "bg-blue"
                        : index === currentIndex
                          ? "bg-signal outline-2 outline-offset-2 outline-ink"
                          : "border-[1.5px] border-dashed border-dash",
                    )}
                    key={row.id}
                  />
                ))}
              </div>
              <div aria-hidden className="flex gap-1.5 font-mono text-xs text-muted uppercase">
                {rows.map((row, index) => (
                  <span className={cn("min-w-0 flex-1 truncate", index === currentIndex && "font-medium text-ink")} key={row.id}>
                    {index === currentIndex ? "▲ " : ""}
                    {row.runwayLabel}
                  </span>
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
                      "grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 border-b border-divider px-5 py-[13px] text-[15px] last:border-b-0 sm:grid-cols-[44px_minmax(0,1fr)_170px]",
                      current && "bg-signal-soft",
                    )}
                    key={row.id}
                  >
                    <span
                      className={cn(
                        "text-[22px] font-extrabold tracking-[-0.03em]",
                        row.done ? "text-blue" : current ? "text-ink" : "text-faint",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <b className={cn("text-ink", row.done ? "font-semibold" : "font-bold")}>{row.title}</b>
                      {row.detail && current ? <span className="text-[13px] text-ink-2">{row.detail}</span> : null}
                    </span>
                    <span className="justify-self-end">
                      {row.done === null ? (
                        <span className="label-mono">Checking</span>
                      ) : row.done ? (
                        <Tag tone="blue">✓ Done</Tag>
                      ) : current ? (
                        <Link
                          className="btn-primary inline-block whitespace-nowrap no-underline"
                          href={row.action.href}
                          style={{ padding: "8px 18px", fontSize: 14 }}
                        >
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
            { label: "Plan progress", value: avgProgress, suffix: "%", href: "/admin/programs/assign" },
            { label: "Open reviews", value: pendingReviews, href: "/admin/content/reviews" },
            {
              label: "Sims run",
              value: activityCounts[0]?.value ?? 0,
              href: "/admin/insights",
            },
          ]}
        />
      </div>

      <aside aria-labelledby="activity-title" className="flex flex-col gap-2.5">
        <h2 className="text-lg font-extrabold text-ink" id="activity-title">
          Activity · 30 days
        </h2>
        <ul className="rounded-[14px] bg-blue p-1 text-white">
          {activityCounts.map((row) => (
            <li
              className="flex items-center justify-between border-b border-blue-2 px-3.5 py-[11px] text-sm last:border-b-0"
              key={row.label}
            >
              <span>{row.label}</span>
              <span className="text-lg font-extrabold text-signal">{row.value}</span>
            </li>
          ))}
        </ul>
        <Link className="link text-sm" href="/admin/insights">
          Full analytics in Insights
        </Link>
      </aside>
    </div>
  );
}
