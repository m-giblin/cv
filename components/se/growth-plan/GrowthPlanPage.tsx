"use client";

import type { AISignal, DevGoal, QuarterSummary } from "./types";

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
      <div className="px-[22px] py-[60px] text-center">
        <div className="mb-3 text-[32px]">🌱</div>
        <div className="mb-2 font-display text-xl font-bold text-[#0D0E12]">Your growth plan is being built</div>
        <div className="mx-auto max-w-[360px] text-xs text-[#6B6860]">
          Your manager is reviewing AI suggestions for your development goals. You&apos;ll be notified when your plan is
          ready.
        </div>
      </div>
    );
  }

  return (
    <div className="px-[22px] pb-[34px] pt-[22px]">
      <div className="mb-[18px] border-l-[3px] border-[#CC27B0] pl-3.5">
        <div className="mb-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#A09D98]">AI-Powered · FY2026</div>
        <h1 className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[#0D0E12]">
          My Growth Plan
        </h1>
        <p className="mt-1 text-xs text-[#6B6860]">Goals set by your manager with AI — your path to the next level</p>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center gap-1.5">
          <div className="ai-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC27B0]" />
          <span className="font-mono text-[8px] tracking-widest text-[#CC27B0]">
            AI ANALYZED {signals.length} DATA SIGNALS TO BUILD THIS PLAN
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {signals.map((sig) => (
            <div
              className="border border-[#EEECE8] bg-[#FAFAF8] p-[9px_12px]"
              key={sig.label}
              style={{ borderLeft: `3px solid ${sig.color}` }}
            >
              <div className="mb-0.5 flex items-center gap-1.5">
                <span className="text-xs">{sig.icon}</span>
                <span className="font-mono text-[7px] tracking-wide text-[#A09D98]">{sig.label}</span>
              </div>
              <div className="mb-px text-[11px] font-bold" style={{ color: sig.color }}>
                {sig.value}
              </div>
              <div className="text-[9px] text-[#6B6860]">{sig.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3">
        {goals.map((goal) => (
          <div
            className="p-[14px_16px]"
            key={goal.title}
            style={{ border: `1px solid ${goal.borderColor}`, background: goal.bg }}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{goal.icon}</span>
                <div>
                  <div className="text-[12.5px] font-bold leading-snug text-[#0D0E12]">{goal.title}</div>
                  <div className="mt-0.5 font-mono text-[7.5px] text-[#A09D98]">
                    {goal.quarter} · {goal.source}
                  </div>
                </div>
              </div>
              <span
                className="shrink-0 whitespace-nowrap font-mono text-[7.5px] font-medium px-2 py-0.5"
                style={{ background: goal.tagBg, color: goal.tagColor }}
              >
                {goal.tag}
              </span>
            </div>
            <div className="mb-1 h-[3px] bg-[#EEECE8]">
              <div className="h-[3px]" style={{ width: `${goal.progress}%`, background: goal.progressColor }} />
            </div>
            <div className="mb-2.5 flex justify-between">
              <span className="font-mono text-[8px] text-[#6B6860]">{goal.progress}% complete</span>
              <span className="font-mono text-[8px]" style={{ color: goal.dueDateColor }}>
                Due {goal.dueDate}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {goal.milestones.map((ms) => (
                <div className="flex items-center gap-[7px]" key={ms.label}>
                  <div
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{
                      background: ms.done ? "#0A6E45" : "#fff",
                      border: `1px solid ${ms.done ? "#0A6E45" : "#D4D1CB"}`,
                    }}
                  />
                  <span className="flex-1 text-[10.5px]" style={{ color: ms.done ? "#0A6E45" : "#3D3C38" }}>
                    {ms.label}
                  </span>
                  <span className="font-mono text-[7.5px] text-[#A09D98]">{ms.date}</span>
                  <span className="text-[9px]">📅</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-px border border-[#E2DFD9] bg-[#E2DFD9] sm:grid-cols-4">
        {quarters.map((q) => (
          <div className="p-[10px_12px]" key={q.label} style={{ background: q.bg, border: `1px solid ${q.border}` }}>
            <div className="mb-1 font-mono text-[8px] font-medium tracking-wide" style={{ color: q.labelColor }}>
              {q.label}
            </div>
            <div className="text-[10.5px] text-[#3D3C38]">{q.summary}</div>
            {q.needsAction ? (
              <div className="mt-1 font-mono text-[7px] tracking-widest text-[#D4810A]">⚠ ACTION NEEDED</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
