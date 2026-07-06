import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { AnimatedProgressFill } from "@/components/se/northstar-animated";
import { SP_BLUE_BTN } from "@/components/se/sp-form-primitives";
import { planStepActionLabel, planStepHref } from "@/lib/utils/plan-links";
import { planStepTypeLabel } from "@/lib/plans/step-labels";
import type { PlanStep, Profile, UserPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

const CARD_SHELL =
  "rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.04)]";

function stepIsValidated(status: PlanStep["status"]) {
  return status === "reviewed" || status === "completed";
}

function formatStartDate(startDate?: string) {
  if (!startDate) return "";
  return new Date(startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function findActiveIndex(steps: PlanStep[]) {
  for (let index = 0; index < steps.length; index += 1) {
    if (stepIsValidated(steps[index]!.status)) continue;
    const priorValidated = steps.slice(0, index).every((step) => stepIsValidated(step.status));
    if (priorValidated) return index;
  }
  return -1;
}

export function MyRampPlanNorthstar({
  plan,
  manager,
  mentor,
}: {
  plan: UserPlan;
  unifiedProgram?: unknown;
  manager?: Profile;
  mentor?: Profile;
  segments?: unknown[];
}) {
  const steps = [...plan.steps].sort((a, b) => a.order - b.order);
  const progress = plan.progress;
  const validatedCount = steps.filter((step) => stepIsValidated(step.status)).length;
  const inProgressCount = steps.filter(
    (step) => step.status === "in_progress" || step.status === "submitted",
  ).length;
  const upcomingCount = steps.length - validatedCount - inProgressCount;
  const resolvedActiveIndex = findActiveIndex(steps);

  const daysRemaining = plan.targetCompletion
    ? Math.max(
        0,
        Math.ceil(
          (new Date(`${plan.targetCompletion}T12:00:00`).getTime() - Date.now()) / 86400000,
        ),
      )
    : null;

  const managerLine = [
    manager ? `Manager: ${manager.fullName}` : null,
    mentor ? `Mentor: ${mentor.fullName}` : null,
    plan.startDate ? `Started ${formatStartDate(plan.startDate)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-[18px]">
      <section className="flex flex-col items-start justify-between gap-5 rounded-[13px] bg-gradient-to-br from-[#00143a] to-[#002060] px-[22px] py-[18px] lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-white/40">
            Active plan
          </p>
          <h2 className="font-display text-[17px] font-extrabold text-white">{plan.name}</h2>
          {managerLine ? <p className="text-[11.5px] text-white/50">{managerLine}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-[22px]">
          <div className="text-center">
            <p className="font-display text-[28px] font-extrabold leading-none text-white">
              {progress}%
            </p>
            <p className="mt-0.5 text-[9.5px] text-white/40">Complete</p>
          </div>
          <div className="h-9 w-px bg-white/10" />
          <div className="text-center">
            <p className="font-display text-[28px] font-extrabold leading-none text-white">
              {validatedCount}/{steps.length}
            </p>
            <p className="mt-0.5 text-[9.5px] text-white/40">Validated</p>
          </div>
          <div className="h-9 w-px bg-white/10" />
          <div className="text-center">
            <p className="font-display text-[28px] font-extrabold leading-none text-[#60a5fa]">
              {daysRemaining !== null ? `${daysRemaining}d` : "—"}
            </p>
            <p className="mt-0.5 text-[9.5px] text-white/40">Remaining</p>
          </div>
        </div>
      </section>

      <div className={cn(CARD_SHELL, "px-[18px] py-3.5")}>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-[#475569]">Overall progress</span>
          <span className="text-[11.5px] font-bold text-[#0071ce]">{progress}%</span>
        </div>
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#e8f2fc]">
          <AnimatedProgressFill
            barClassName="rounded-full bg-gradient-to-r from-[#0071ce] to-[#0033a1]"
            className="rounded-full"
            percent={progress}
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-[7px] w-[7px] rounded-full bg-[#10b981]" />
            <span className="text-[10.5px] text-[#64748b]">{validatedCount} validated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-[7px] w-[7px] rounded-full bg-[#0071ce]" />
            <span className="text-[10.5px] text-[#64748b]">{inProgressCount} in progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-[7px] w-[7px] rounded-full border border-[#d0dae8] bg-[#e2eaf5]" />
            <span className="text-[10.5px] text-[#64748b]">{upcomingCount} upcoming</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {steps.map((step, index) => {
          const isValidated = stepIsValidated(step.status);
          const isActive = index === resolvedActiveIndex && !isValidated;

          if (isValidated) {
            return (
              <div
                className={cn(CARD_SHELL, "flex items-center gap-3.5 px-[18px] py-3 opacity-[0.72]")}
                key={step.id}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dcfce7]">
                  <Check className="h-3.5 w-3.5 text-[#16a34a]" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-[5px] bg-[#e8f2fc] px-[7px] py-0.5 text-[9.5px] font-bold text-[#0057a8]">
                      {planStepTypeLabel(step.type)}
                    </span>
                    <span className="rounded-[5px] bg-[#dcfce7] px-[7px] py-0.5 text-[9.5px] font-bold text-[#15803d]">
                      Validated
                    </span>
                  </div>
                  <p className="text-[12.5px] font-semibold text-[#94a3b8] line-through">
                    {step.title}
                  </p>
                  {step.dueDate ? (
                    <p className="text-[10px] text-[#94a3b8]">Completed · {step.dueDate}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[11px] font-semibold text-[#16a34a]">Done</span>
              </div>
            );
          }

          if (isActive) {
            return (
              <div
                className="flex items-center gap-3.5 rounded-xl border-2 border-[#0071ce] bg-white px-[18px] py-4 shadow-[0_4px_20px_rgba(0,113,206,0.12)]"
                key={step.id}
              >
                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#0071ce]">
                  <span className="font-display text-sm font-extrabold text-white">{step.order}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-[5px] bg-[#e8f2fc] px-[7px] py-0.5 text-[9.5px] font-bold text-[#0057a8]">
                      {planStepTypeLabel(step.type)}
                    </span>
                    <span className="rounded-[5px] bg-[#dbeafe] px-[7px] py-0.5 text-[9.5px] font-bold text-[#1d4ed8]">
                      {step.status === "submitted" ? "Submitted" : "In progress"}
                    </span>
                    {step.dueDate ? (
                      <span className="text-[9.5px] font-semibold text-[#f59e0b]">
                        Due {step.dueDate}
                      </span>
                    ) : null}
                  </div>
                  <p className="font-display text-[13.5px] font-extrabold text-[#0a1628]">
                    {step.title}
                  </p>
                  {step.description ? (
                    <p className="text-[11.5px] leading-relaxed text-[#64748b]">{step.description}</p>
                  ) : null}
                </div>
                <Link className={cn(SP_BLUE_BTN, "shrink-0 gap-1")} href={planStepHref(step)}>
                  {planStepActionLabel(step)}
                  <ChevronRight className="h-2.5 w-2.5" />
                </Link>
              </div>
            );
          }

          return (
            <div
              className={cn(CARD_SHELL, "flex items-center gap-3.5 px-[18px] py-3")}
              key={step.id}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9]">
                <span className="font-display text-[13px] font-extrabold text-[#94a3b8]">
                  {step.order}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-[5px] bg-[#f1f5f9] px-[7px] py-0.5 text-[9.5px] font-bold text-[#64748b]">
                    {planStepTypeLabel(step.type)}
                  </span>
                  <span className="rounded-[5px] bg-[#f1f5f9] px-[7px] py-0.5 text-[9.5px] font-bold text-[#64748b]">
                    Upcoming
                  </span>
                </div>
                <p className="text-[12.5px] font-semibold text-[#475569]">{step.title}</p>
                {step.description ? (
                  <p className="text-[10.5px] text-[#94a3b8]">{step.description}</p>
                ) : null}
              </div>
              {step.dueDate ? (
                <span className="shrink-0 text-[10.5px] text-[#94a3b8]">{step.dueDate}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
