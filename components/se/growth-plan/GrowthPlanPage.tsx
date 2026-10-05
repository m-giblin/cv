"use client";

import { H2_CLS, LINE_CARD_CLS } from "@/components/se/form-classes";
import { Tag } from "@/components/ui/tag";
import type { AISignal, DevGoal, QuarterSummary } from "./types";

type Tone = "neutral" | "blue" | "success" | "warning" | "danger";

/** Data colours arrive as v2 hex values; translate them into v2 tones + symbols (never colour alone). */
function signalTone(color: string): { tone: Tone; symbol: string } {
  switch (color.trim().toUpperCase()) {
    case "#B42318":
      return { tone: "danger", symbol: "▲" };
    case "#8A5300":
      return { tone: "warning", symbol: "•" };
    case "#12703F":
      return { tone: "success", symbol: "✓" };
    default:
      return { tone: "blue", symbol: "●" };
  }
}

const SIGNAL_TEXT: Record<Tone, string> = {
  neutral: "text-ink",
  blue: "text-blue",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

function goalStatus(goal: DevGoal): { tone: Tone; label: string } {
  if (goal.progress >= 100) {
    return { tone: "success", label: "✓ Achieved" };
  }
  switch (goal.tag) {
    case "AT RISK":
      return { tone: "danger", label: "▲ At risk" };
    case "NOT STARTED":
      return { tone: "neutral", label: "○ Not started" };
    case "IN PROGRESS":
      return { tone: "blue", label: "● In progress" };
    case "ON TRACK":
      return { tone: "blue", label: "● On track" };
    default:
      return { tone: "warning", label: `• ${goal.tag.charAt(0)}${goal.tag.slice(1).toLowerCase()}` };
  }
}

function quarterState(q: QuarterSummary): "action" | "current" | "default" {
  if (q.needsAction) return "action";
  if (q.labelColor.trim().toUpperCase() === "#0033A1") return "current";
  return "default";
}

export function GrowthPlanPage({
  signals,
  goals,
  quarters,
  hasPlan,
}: {
  signals: AISignal[];
  goals: DevGoal[];
  quarters: QuarterSummary[];
  hasPlan: boolean;
}) {
  if (!hasPlan) {
    return (
      <div className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center">
        <p className="text-base font-bold text-ink">Your growth plan is being built</p>
        <p className="mx-auto mt-1.5 max-w-[420px] text-[15px] text-muted">
          Your manager is reviewing AI suggestions for your development goals. You&apos;ll be notified when your plan is
          ready.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {signals.length > 0 ? (
        <section aria-labelledby="growth-signals-heading" className={`${LINE_CARD_CLS} overflow-hidden`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-divider px-5 py-3.5">
            <h2 className="text-base font-bold text-ink" id="growth-signals-heading">
              What shaped this plan
            </h2>
            <span className="label-mono">
              AI analysed {signals.length} signal{signals.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="-mb-px -mr-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {signals.map((sig) => {
              const { tone, symbol } = signalTone(sig.color);
              return (
                <li className="border-b border-r border-divider px-5 py-3.5" key={sig.label}>
                  <p className="font-mono text-xs uppercase tracking-[0.03em] text-muted">{sig.label}</p>
                  <p className={`mt-1 text-[15px] font-bold ${SIGNAL_TEXT[tone]}`}>
                    <span aria-hidden="true">{symbol} </span>
                    {sig.value}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">{sig.detail}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="growth-goals-heading" className="flex flex-col gap-3">
        <h2 className={H2_CLS} id="growth-goals-heading">
          Goals
        </h2>
        <ul className={`${LINE_CARD_CLS} divide-y divide-divider`}>
          {goals.map((goal) => {
            const status = goalStatus(goal);
            const progress = Math.max(0, Math.min(100, goal.progress));
            return (
              <li className="px-5 py-4" key={goal.title}>
                <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto_90px] sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-snug text-ink">{goal.title}</p>
                    <p className="mt-0.5 font-mono text-xs uppercase tracking-[0.03em] text-muted">
                      {goal.quarter} · {goal.source}
                    </p>
                  </div>
                  <Tag tone={status.tone}>{status.label}</Tag>
                  <span className="font-mono text-xs uppercase text-ink-2 sm:text-right">Due {goal.dueDate}</span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div
                    aria-label={`${goal.title} progress`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={progress}
                    className="h-2 flex-1 overflow-hidden rounded-[4px] bg-divider"
                    role="progressbar"
                  >
                    <div className="h-full rounded-[4px] bg-blue" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="w-[92px] shrink-0 text-right font-mono text-xs text-muted">{progress}% done</span>
                </div>

                {goal.milestones.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {goal.milestones.map((ms) => (
                      <li className="flex items-center gap-2.5 text-sm" key={ms.label}>
                        <span
                          aria-hidden="true"
                          className={`w-4 shrink-0 text-center font-mono text-xs ${ms.done ? "text-blue" : "text-muted"}`}
                        >
                          {ms.done ? "✓" : "○"}
                        </span>
                        <span className={`flex-1 ${ms.done ? "text-ink" : "text-ink-2"}`}>
                          {ms.label}
                          <span className="sr-only">{ms.done ? " (done)" : " (not done)"}</span>
                        </span>
                        <span className="font-mono text-xs text-muted">{ms.date}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {quarters.length > 0 ? (
        <section aria-labelledby="growth-quarters-heading" className="flex flex-col gap-3">
          <h2 className={H2_CLS} id="growth-quarters-heading">
            Quarterly reviews
          </h2>
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-divider sm:grid-cols-4">
            {quarters.map((q) => {
              const state = quarterState(q);
              return (
                <li
                  aria-current={state === "current" ? "true" : undefined}
                  className={`px-4 py-3 ${
                    state === "current" ? "bg-blue-soft" : state === "action" ? "bg-danger-soft" : "bg-white"
                  }`}
                  key={q.label}
                >
                  <p
                    className={`font-mono text-xs font-medium uppercase tracking-[0.03em] ${
                      state === "current" ? "text-blue" : state === "action" ? "text-danger" : "text-muted"
                    }`}
                  >
                    {q.label}
                    {state === "current" ? " · ● Now" : ""}
                  </p>
                  <p className="mt-1 text-sm text-ink-2">{q.summary}</p>
                  {q.needsAction ? (
                    <p className="mt-1 font-mono text-xs uppercase tracking-[0.03em] text-danger">▲ Action needed</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
