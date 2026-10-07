"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ReviewEditor } from "@/components/development/development-plan-panel";
import { HeaderStat } from "@/components/manager/team-member-bits";
import { Drawer } from "@/components/ui/drawer";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
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

type Goal = DevelopmentPlan["goals"][number];
type Review = Goal["quarterlyReviews"][number];
type CheckIn = { goal: Goal; review: Review; overdue: boolean };
type Focus = "overdue" | "due" | "noPlan" | null;

function Avatar({ name }: { name: string }) {
  return (
    <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-soft text-[12px] font-bold text-blue">
      {initials(name)}
    </span>
  );
}

/**
 * Coaching › Development: SEs with a plan as compact cards (goals plus any quarterly check-ins
 * due, overdue first); SEs without one in a short list. Click a person to open their plan.
 */
export function ManagerDevelopmentPlansPanel({
  developmentPlans = [],
  org = [],
}: {
  developmentPlans?: DevelopmentPlan[];
  org?: Profile[];
  onOpenProfile?: (profileId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus>(null);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function saveCheckIn(reviewId: string, payload: Record<string, unknown>) {
    setSaving(true);
    const response = await fetch(`/api/development/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof body?.error === "string" ? body.error : "Add a comment of at least 3 characters, then save.");
      return;
    }
    toast.success("Check-in saved");
    setEditingReview(null);
    router.refresh();
  }
  const now = Date.now();
  const quarter = currentQuarter();
  const team = uniqueProfiles(org);
  const planByUser = new Map(developmentPlans.map((plan) => [plan.userId, plan]));

  // A check-in is due when its quarter's review hasn't started and the due date is within 14 days (or past).
  const checkInsFor = (plan: DevelopmentPlan): CheckIn[] =>
    plan.goals.flatMap((goal) =>
      goal.quarterlyReviews
        .filter((review) => review.status === "not_started" && new Date(review.dueDate).getTime() <= now + 14 * DAY)
        .map((review) => ({ goal, review, overdue: new Date(review.dueDate).getTime() < now })),
    );

  const withPlan = team
    .filter((profile) => planByUser.has(profile.id))
    .map((profile) => {
      const plan = planByUser.get(profile.id)!;
      const checkIns = checkInsFor(plan);
      return { profile, plan, checkIns, overdue: checkIns.filter((item) => item.overdue).length };
    })
    .sort((a, b) => b.overdue - a.overdue || b.checkIns.length - a.checkIns.length || a.profile.fullName.localeCompare(b.profile.fullName));
  const noPlan = team.filter((profile) => !planByUser.has(profile.id));
  const dueTotal = withPlan.reduce((sum, item) => sum + item.checkIns.length, 0);
  const overdueTotal = withPlan.reduce((sum, item) => sum + item.overdue, 0);

  const shownWithPlan =
    focus === "overdue" ? withPlan.filter((item) => item.overdue) : focus === "due" ? withPlan.filter((item) => item.checkIns.length) : focus === "noPlan" ? [] : withPlan;
  const open = withPlan.find((item) => item.profile.id === openId) ?? null;
  const toggle = (value: Focus) => setFocus((current) => (current === value ? null : value));

  return (
    <>
      <PageHeader
        accent="Plans that outlast the ramp."
        actions={
          <div className="flex gap-12">
            <button className="text-left" onClick={() => toggle("noPlan")} title="Show who has no plan" type="button">
              <HeaderStat label="Plans" value={`${withPlan.length}/${team.length}`} />
            </button>
            <button className="text-left" onClick={() => toggle("due")} title="Show who has check-ins due" type="button">
              <HeaderStat label="Check-ins due" value={dueTotal} />
            </button>
            <button className="text-left" onClick={() => toggle("overdue")} title="Show who is overdue" type="button">
              <HeaderStat label="Overdue" tone={overdueTotal > 0 ? "danger" : "blue"} value={overdueTotal} />
            </button>
          </div>
        }
        eyebrow={`Coaching, ${quarter}`}
        subtitle="Each goal gets a quarterly check-in: you confirm how it's going. Overdue people come first."
        title="Development."
      />
      <PageBody className="flex flex-col gap-6 pb-7">
        {focus ? (
          <p className="flex items-center gap-3 text-sm text-ink-2">
            Showing {focus === "overdue" ? "people with overdue check-ins" : focus === "due" ? "people with check-ins due" : "people without a plan"}.
            <button className="link text-sm" onClick={() => setFocus(null)} type="button">
              Show everyone
            </button>
          </p>
        ) : null}

        {team.length === 0 ? (
          <p className="rounded-[14px] border border-line bg-white px-5 py-10 text-center text-[15px] text-muted">No one reports to you yet.</p>
        ) : null}

        {shownWithPlan.length ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold text-ink">Plans ({shownWithPlan.length})</h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {shownWithPlan.map(({ profile, plan, checkIns, overdue }) => (
                <button
                  className={cn(
                    "flex flex-col gap-2 rounded-[14px] border bg-white px-4 py-3 text-left shadow-[var(--shadow-card)] hover:border-line-strong",
                    overdue ? "border-danger/40" : "border-line",
                  )}
                  key={profile.id}
                  onClick={() => setOpenId(profile.id)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={profile.fullName} />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-bold text-ink">{profile.fullName}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {profile.level}, {plan.year} plan
                        </span>
                      </span>
                    </span>
                    {overdue ? (
                      <StatusPill tone="danger">{overdue} overdue</StatusPill>
                    ) : checkIns.length ? (
                      <StatusPill tone="warning">{checkIns.length} due soon</StatusPill>
                    ) : null}
                  </span>
                  {plan.goals.length ? (
                    <ul className="m-0 flex list-none flex-col gap-1 p-0">
                      {plan.goals.map((goal) => {
                        const pill = GOAL_PILL[goal.overallStatus];
                        return (
                          <li className="flex items-center justify-between gap-2 text-[13px]" key={goal.id}>
                            <span className="truncate text-ink-2">{goal.title}</span>
                            <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <span className="text-[13px] text-muted">No goals yet.</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {noPlan.length && (focus === null || focus === "noPlan") ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold text-ink">No plan yet ({noPlan.length})</h2>
            <ul className="m-0 grid list-none grid-cols-1 overflow-hidden rounded-[14px] border border-line bg-white p-0 md:grid-cols-2">
              {noPlan.map((profile) => (
                <li className="flex items-center justify-between gap-3 border-b border-divider px-4 py-2 md:odd:border-r" key={profile.id}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={profile.fullName} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{profile.fullName}</span>
                      <span className="block truncate text-[12px] text-muted">{profile.level}</span>
                    </span>
                  </span>
                  <Link className="link shrink-0 text-sm" href={`/development?profile=${profile.id}`}>
                    Create plan
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </PageBody>

      {open ? (
        <Drawer
          bodyWidth="full"
          eyebrow="Development plan"
          footer={
            <Link className="btn-primary" href={`/development?profile=${open.profile.id}`}>
              Edit plan
            </Link>
          }
          onClose={() => {
            setOpenId(null);
            setEditingReview(null);
          }}
          open
          subtitle={`${open.profile.level}, ${open.plan.year} plan, ${open.plan.goals.length} goal${open.plan.goals.length === 1 ? "" : "s"}`}
          title={open.profile.fullName}
        >
          <div className="flex flex-col gap-5">
            {open.checkIns.length ? (
              <section className="flex flex-col gap-2">
                <h3 className="label-caps m-0">Check-ins due</h3>
                <ul className="m-0 list-none overflow-hidden rounded-[12px] border border-line bg-white p-0">
                  {open.checkIns
                    .sort((a, b) => a.review.dueDate.localeCompare(b.review.dueDate))
                    .map(({ goal, review, overdue }) => (
                      <li className="border-b border-divider last:border-b-0" key={review.id}>
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-ink">{goal.title}</span>
                          <span className="block text-[13px] text-muted">
                            {review.quarter} check-in, due {format(new Date(review.dueDate), "MMM d")}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <StatusPill tone={overdue ? "danger" : "warning"}>{overdue ? "Overdue" : "Due soon"}</StatusPill>
                          <button
                            aria-expanded={editingReview === review.id}
                            className="link text-sm font-bold"
                            onClick={() => setEditingReview(editingReview === review.id ? null : review.id)}
                            type="button"
                          >
                            {editingReview === review.id ? "Close" : "Check in"}
                          </button>
                        </span>
                        </div>
                        {editingReview === review.id ? (
                          <div className="border-t border-divider bg-bg px-4 py-4">
                            <ReviewEditor
                              isManager
                              isSaving={saving}
                              onClose={() => setEditingReview(null)}
                              onSave={(payload) => void saveCheckIn(review.id, payload)}
                              review={review}
                            />
                          </div>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </section>
            ) : null}
            <section className="flex flex-col gap-2">
              <h3 className="label-caps m-0">Goals</h3>
              <ul className="m-0 list-none overflow-hidden rounded-[12px] border border-line bg-white p-0">
                {open.plan.goals.map((goal) => {
                  const pill = GOAL_PILL[goal.overallStatus];
                  const review = goal.quarterlyReviews.find((item) => item.quarter === quarter && item.year === open.plan.year);
                  return (
                    <li className="flex items-start justify-between gap-3 border-b border-divider px-4 py-2.5 last:border-b-0" key={goal.id}>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-ink">{goal.title}</span>
                        {review ? (
                          <span className="block text-[13px] text-muted">
                            {quarter} check-in: {review.status.replaceAll("_", " ")}
                          </span>
                        ) : null}
                      </span>
                      <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </Drawer>
      ) : null}
    </>
  );
}
