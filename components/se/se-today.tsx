import Link from "next/link";
import { CredentialBadge } from "@/components/se/credential-badge";
import { Greeting } from "@/components/se/greeting";
import { PreflightRailCard } from "@/components/se/preflight-rail-card";
import { RampRunway } from "@/components/se/ramp-runway";
import { FlightStrip } from "@/components/ui/flight-strip";
import { RampCard } from "@/components/ui/ramp-card";
import { Schedule } from "@/components/ui/schedule";
import { planStepTypeLabel } from "@/lib/plans/step-labels";
import type { GateRow } from "@/lib/se/gate-matrix";
import {
  buildRampModel,
  dayAndMonth,
  isStepWithReviewer,
  pad2,
  paceLabel,
  stepLifecycle,
  stepMeta,
} from "@/lib/se/ramp-model";
import type { DashboardData, PlanStep, Profile } from "@/lib/types";
import { planStepHref } from "@/lib/utils/plan-links";

function managerShort(manager: Profile | undefined): string | null {
  if (!manager) return null;
  const parts = manager.fullName.split(" ").filter(Boolean);
  if (parts.length < 2) return manager.fullName;
  return `${parts[0]![0]}. ${parts[parts.length - 1]}`;
}

function dueNote(step: PlanStep, reviewer: string): string {
  if (isStepWithReviewer(step.status)) return `SUBMITTED · WITH ${reviewer.toUpperCase()}`;
  if (!step.dueDate) return step.status === "in_progress" ? "IN PROGRESS" : "NOT STARTED";
  const due = new Date(`${step.dueDate.slice(0, 10)}T12:00:00`).getTime();
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00`).getTime();
  const days = Math.round((due - today) / 86_400_000);
  if (days < 0) return `▲ ${Math.abs(days)} DAY${days === -1 ? "" : "S"} OVERDUE`;
  if (days === 0) return "DUE TODAY";
  return `DUE IN ${days} DAY${days === 1 ? "" : "S"}`;
}

/** SE › Today (artboard 1a): next step first, the next three runway items, credential + ramp in the rail. */
export function SeToday({ data, gateRows }: { data: DashboardData; gateRows: GateRow[] }) {
  const user = data.currentUser;
  const firstName = user.fullName.split(" ")[0] ?? "there";
  const plan = data.plans.find((item) => item.userId === user.id);
  const manager = data.profiles.find((profile) => profile.id === user.managerId);
  const mentor = plan?.mentorId ? data.profiles.find((profile) => profile.id === plan.mentorId) : undefined;
  const model = plan ? buildRampModel(plan) : null;
  const next = model?.nextStep ?? null;
  const reviewerProfile = next?.type === "mentor_review" && mentor ? mentor : manager;
  const reviewerFirst = reviewerProfile?.fullName.split(" ")[0] ?? null;

  const eyebrow = [
    `${user.level} SE`,
    plan?.name,
    managerShort(manager) ? `MGR ${managerShort(manager)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const scheduleRows = (model?.upcoming ?? []).slice(0, 3).map((step) => {
    const { day, month } = dayAndMonth(step.dueDate);
    const segment = step.segmentIndex ?? null;
    const isLastSegment = model ? segment === model.segments[model.segments.length - 1]?.index : true;
    return {
      id: step.id,
      day,
      month,
      gate: Boolean(step.isSegmentGate),
      title: step.title,
      meta: step.isSegmentGate
        ? segment && !isLastSegment
          ? `◆ GATE · UNLOCKS SEGMENT ${segment + 1}`
          : "◆ GATE"
        : `${planStepTypeLabel(step.type)}${step.locked ? " · LOCKED" : ""}`,
    };
  });

  return (
    <div className="flex flex-col">
      <header className="flex flex-wrap items-end justify-between gap-6 px-[var(--gutter)] pt-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="label-mono">{eyebrow}</p>
          <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">
            <Greeting firstName={firstName} />
          </h1>
        </div>
        {model ? (
          <p aria-label={`Week ${model.currentWeek} of ${model.totalWeeks}`} className="flex items-baseline gap-1.5">
            <span aria-hidden className="label-mono mr-1.5">
              Week
            </span>
            <span aria-hidden className="text-[64px] leading-[0.85] font-extrabold tracking-[-0.04em] text-blue">
              {pad2(model.currentWeek)}
            </span>
            <span aria-hidden className="text-[22px] font-bold text-faint">
              /{model.totalWeeks}
            </span>
          </p>
        ) : null}
      </header>

      {model ? <RampRunway className="px-[var(--gutter)] pt-4 pb-5" model={model} /> : <div className="h-5" />}

      <div className="flex flex-wrap items-start gap-7 px-[var(--gutter)] pb-7">
        <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-[22px]">
          {!plan || !model ? (
            <div className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-[15px] text-muted">
              <p className="text-lg font-extrabold text-ink">No ramp plan yet</p>
              <p className="mt-1">
                {manager
                  ? `${manager.fullName} will assign your ramp plan. You can reach them at ${manager.email}.`
                  : "Your manager will assign a ramp plan when you join the program."}
              </p>
            </div>
          ) : next ? (
            <FlightStrip
              lifecycle={stepLifecycle(next, reviewerFirst)}
              numeral={pad2(model.nextStepNumber)}
              numeralCaption={`OF ${pad2(model.total)}`}
              stubLabel={isStepWithReviewer(next.status) ? "WAITING" : "NEXT STEP"}
            >
              <span className="font-mono text-xs text-muted uppercase">{stepMeta(next)}</span>
              <h2 className="text-[25px] leading-[1.1] font-extrabold tracking-[-0.015em] text-ink">{next.title}</h2>
              {next.description ? (
                <p className="max-w-[560px] text-[15px] leading-[1.5] text-ink-2">{next.description}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-[18px]">
                {isStepWithReviewer(next.status) ? (
                  <button className="btn-primary" disabled type="button">
                    Waiting on {reviewerFirst ?? "your manager"}
                  </button>
                ) : next.locked ? (
                  <button className="btn-primary" disabled type="button">
                    Locked until the segment gate clears
                  </button>
                ) : (
                  <Link className="btn-primary" href={planStepHref(next)}>
                    {next.status === "in_progress" ? "Continue" : "Start"} {planStepTypeLabel(next.type).toLowerCase()} →
                  </Link>
                )}
                <span className="font-mono text-xs text-muted">{dueNote(next, reviewerFirst ?? "manager")}</span>
              </div>
            </FlightStrip>
          ) : (
            <FlightStrip numeral="✓" numeralCaption={`${model.total} OF ${model.total}`} stubLabel="FIELD READY">
              <span className="font-mono text-xs text-muted uppercase">Ramp complete</span>
              <h2 className="text-[25px] leading-[1.1] font-extrabold tracking-[-0.015em] text-ink">
                Every ramp step is validated.
              </h2>
              <p className="max-w-[560px] text-[15px] leading-[1.5] text-ink-2">
                Keep your certification gates moving and your skills sharp in Practice.
              </p>
              <div className="mt-1">
                <Link className="btn-primary" href="/readiness/certification">
                  Open certification →
                </Link>
              </div>
            </FlightStrip>
          )}

          {scheduleRows.length > 0 ? (
            <section aria-labelledby="next-on-runway" className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-extrabold text-ink" id="next-on-runway">
                  Next on the runway
                </h2>
                <Link className="link text-sm" href="/my-plan">
                  Full ramp plan
                </Link>
              </div>
              <Schedule rows={scheduleRows} />
            </section>
          ) : null}
        </div>

        <aside aria-label="Progress" className="flex w-[300px] max-w-full flex-none flex-col gap-3.5">
          <CredentialBadge profile={user} rows={gateRows} />
          {model ? (
            <RampCard
              caption="steps validated"
              done={model.validated}
              note={model.daysLeft !== null ? `${model.daysLeft} DAYS LEFT · ${paceLabel(model)}` : paceLabel(model)}
              total={model.total}
            />
          ) : null}
          <PreflightRailCard />
        </aside>
      </div>
    </div>
  );
}
