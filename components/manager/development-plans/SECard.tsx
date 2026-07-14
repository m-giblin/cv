"use client";

import type { SEDevProfile } from "./types";
import { GoalCard } from "./GoalCard";
import { quarterStyle } from "./utils/goalBuilder";

function statusStyle(status: SEDevProfile["status"]): { bg: string; color: string } {
  switch (status) {
    case "ACTIVE":
      return { bg: "rgba(10,110,69,.08)", color: "#0A6E45" };
    case "AI PLAN READY":
      return { bg: "rgba(204,39,176,.08)", color: "#CC27B0" };
    case "NO PLAN":
      return { bg: "rgba(184,49,40,.08)", color: "#B83128" };
    case "COMPLETE":
      return { bg: "rgba(0,113,206,.08)", color: "#0071CE" };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function SECard({
  se,
  isApproved,
  animationDelay,
  onReviewAI,
  onViewPlan,
  onSubmitContent,
}: {
  se: SEDevProfile;
  isApproved: boolean;
  animationDelay: string;
  onReviewAI: () => void;
  onViewPlan: () => void;
  onSubmitContent: (title: string) => void;
}) {
  const roleStyle = { bg: "rgba(0,113,206,.08)", color: "#0071CE" };
  const st = statusStyle(se.status);

  return (
    <div
      className="animate-[fadeUp_0.3s_ease_both] border border-[#E2DFD9] bg-white"
      style={{ animationDelay }}
    >
      <div className="flex items-center gap-3.5 border-b border-[#F0EFEB] p-[14px_18px]">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ background: se.avatarBg }}
        >
          {se.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[#0D0E12]">{se.name}</span>
            <span
              className="font-mono text-[8px] font-medium tracking-widest px-2 py-0.5"
              style={{ background: roleStyle.bg, color: roleStyle.color }}
            >
              {se.role}
            </span>
            <span
              className="font-mono text-[8px] font-medium tracking-widest px-2 py-0.5"
              style={{ background: st.bg, color: st.color }}
            >
              {se.status}
            </span>
            {se.hasAiSuggestion ? (
              <div className="flex items-center gap-1.5 border border-[rgba(204,39,176,.15)] bg-[rgba(204,39,176,.06)] px-2 py-0.5">
                <div className="ai-dot h-[5px] w-[5px] shrink-0 rounded-full bg-[#CC27B0]" />
                <span className="font-mono text-[7.5px] tracking-widest text-[#CC27B0]">{se.aiLabel}</span>
              </div>
            ) : null}
          </div>
          <div className="mt-0.5 font-mono text-[8.5px] text-[#A09D98]">
            {se.level} · Day {se.day} · FY2026 · {se.goalCount}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {se.hasAiSuggestion ? (
            <button
              className="cursor-pointer border border-[rgba(204,39,176,.2)] bg-[rgba(204,39,176,.08)] px-2.5 py-[5px] text-[9px] font-semibold text-[#CC27B0]"
              onClick={onReviewAI}
              type="button"
            >
              Review AI plan →
            </button>
          ) : null}
          <button
            className="cursor-pointer border border-[#D4D1CB] bg-[#F5F4F0] px-2.5 py-[5px] text-[9px] font-semibold text-[#3D3C38]"
            onClick={onViewPlan}
            type="button"
          >
            View full plan
          </button>
        </div>
      </div>

      {se.goals.length > 0 ? (
        <div className="flex flex-wrap gap-3 p-[14px_18px]">
          {se.goals.map((goal) => (
            <GoalCard goal={goal} key={goal.title} onSubmitContent={onSubmitContent} />
          ))}
        </div>
      ) : isApproved ? null : (
        <div className="p-[14px_18px] text-[11px] text-[#A09D98]">Approve the AI plan to populate goals and milestones.</div>
      )}

      <div className="flex gap-px px-[18px] pb-3.5">
        {se.quarters.map((q) => {
          const qs = quarterStyle(q.state);
          return (
            <div
              className="flex-1 p-[8px_10px]"
              key={q.label}
              style={{ background: qs.bg, border: `1px solid ${qs.border}` }}
            >
              <div className="mb-1 font-mono text-[7.5px] font-medium tracking-wide" style={{ color: qs.labelColor }}>
                {q.label}
              </div>
              <div className="text-[10px] leading-snug text-[#3D3C38]">{q.summary}</div>
              {q.needsAction ? (
                <div className="mt-1 font-mono text-[7px] tracking-widest text-[#D4810A]">⚠ NEEDS SIGN-OFF</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
