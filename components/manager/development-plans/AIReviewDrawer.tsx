"use client";

import type { SEDevProfile } from "./types";

function suggestedGoalStyle(tag: string): { border: string; bg: string; tagBg: string; tagColor: string } {
  if (tag === "URGENT") {
    return {
      border: "rgba(184,49,40,.2)",
      bg: "#FFF8F7",
      tagBg: "rgba(184,49,40,.08)",
      tagColor: "#B83128",
    };
  }
  if (tag === "AI CHALLENGE") {
    return {
      border: "rgba(204,39,176,.15)",
      bg: "#FDF7FE",
      tagBg: "rgba(204,39,176,.08)",
      tagColor: "#CC27B0",
    };
  }
  return {
    border: "rgba(212,129,10,.15)",
    bg: "#FFFAF5",
    tagBg: "rgba(212,129,10,.08)",
    tagColor: "#D4810A",
  };
}

export function AIReviewDrawer({
  se,
  onClose,
  onApprove,
  onAddToCalendar,
}: {
  se: SEDevProfile;
  onClose: () => void;
  onApprove: () => void;
  onAddToCalendar: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[800] bg-black/40" onClick={onClose} role="presentation" />
      <div className="fixed bottom-0 right-0 top-0 z-[801] flex w-[520px] max-w-full flex-col bg-white animate-[slideIn_0.25s_ease]">
        <div className="flex shrink-0 items-center justify-between bg-[#00143A] p-[14px_18px]">
          <div>
            <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/50">AI Growth Plan</div>
            <div className="font-display text-base font-bold text-white">{se.name}</div>
            <div className="mt-0.5 font-mono text-[8px] text-white/45">
              {se.level} · {se.role} · Day {se.day}
            </div>
          </div>
          <button
            className="flex h-8 w-8 cursor-pointer items-center justify-center border border-white/15 bg-white/10 text-lg text-white/60"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="shrink-0 border-b border-[#F0EFEB] bg-[#FAFAF8] p-[14px_18px]">
          <div className="mb-2 flex items-center gap-1.5">
            <div className="ai-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC27B0]" />
            <span className="font-mono text-[8px] tracking-widest text-[#CC27B0]">AI ANALYSIS</span>
          </div>
          <div className="text-[11.5px] leading-relaxed text-[#3D3C38]">{se.aiReasoning}</div>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-[14px_18px]">
          <div className="mb-0.5 font-mono text-[8px] uppercase tracking-widest text-[#A09D98]">Suggested development goals</div>
          {se.suggestedGoals.map((sg) => {
            const style = suggestedGoalStyle(sg.tag);
            return (
              <div className="p-[12px_14px]" key={sg.title} style={{ border: `1px solid ${style.border}`, background: style.bg }}>
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{sg.icon}</span>
                    <div>
                      <div className="text-[11.5px] font-semibold text-[#0D0E12]">{sg.title}</div>
                      <div className="mt-px font-mono text-[7.5px] text-[#A09D98]">
                        {sg.quarter} · {sg.effort}
                      </div>
                    </div>
                  </div>
                  <span
                    className="whitespace-nowrap font-mono text-[7px] tracking-wide px-1.5 py-0.5"
                    style={{ background: style.tagBg, color: style.tagColor }}
                  >
                    {sg.tag}
                  </span>
                </div>
                <div className="mb-2 text-[10.5px] leading-snug text-[#6B6860]">{sg.rationale}</div>
                <div className="flex flex-wrap gap-1.5">
                  {sg.chips.map((chip) => (
                    <span className="border border-[#E2DFD9] bg-[#F5F4F0] px-2 py-0.5 text-[9px] text-[#6B6860]" key={chip}>
                      {chip}
                    </span>
                  ))}
                </div>
                {sg.isNew ? (
                  <div className="mt-2 border border-dashed border-[rgba(204,39,176,.25)] bg-[rgba(204,39,176,.04)] p-[6px_8px] text-[9.5px] text-[#CC27B0]">
                    ✦ No existing content — AI will draft scenario brief for content team
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-[#E2DFD9] p-[14px_18px]">
          <button
            className="flex-1 cursor-pointer border border-[#D4D1CB] bg-[#F5F4F0] py-2 text-[10px] font-semibold text-[#3D3C38]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-1 cursor-pointer border border-[rgba(0,113,206,.2)] bg-[#F0F7FF] py-2 text-[10px] font-semibold text-[#0071CE]"
            onClick={onAddToCalendar}
            type="button"
          >
            Add milestones to calendar
          </button>
          <button
            className="flex-1 cursor-pointer bg-[#0071CE] py-2 text-[10px] font-semibold text-white"
            onClick={onApprove}
            type="button"
          >
            Approve plan →
          </button>
        </div>
      </div>
    </>
  );
}
