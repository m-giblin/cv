"use client";

import { getContentBriefForGoal, seNameForBrief } from "./data";

export function ContentSubmitModal({
  goalTitle,
  onClose,
  onSubmit,
}: {
  seId: string;
  goalTitle: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const brief = getContentBriefForGoal(goalTitle, seNameForBrief(goalTitle));
  const seName = seNameForBrief(goalTitle);

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[88vh] w-[620px] max-w-full flex-col bg-white shadow-[0_32px_80px_rgba(0,0,0,.35)] animate-[fadeUp_0.2s_ease]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="relative shrink-0 bg-[#00143A] p-[16px_20px]">
          <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[#CC27B0] to-[#0071CE]" />
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/45">
                AI-Generated Content Request
              </div>
              <div className="font-display text-base font-bold leading-snug text-white">{brief.scenarioTitle}</div>
              <div className="mt-1 font-mono text-[8px] text-white/40">
                Requested by Demo Manager · For {seName} · Simulation Scenario
              </div>
            </div>
            <button
              className="ml-3 flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center border border-white/15 bg-white/10 text-lg text-white/50"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="font-mono text-[7.5px] tracking-wide px-2 py-0.5 bg-[rgba(204,39,176,.25)] text-[#E87FD4]">
              {brief.difficulty}
            </span>
            <span className="font-mono text-[7.5px] tracking-wide px-2 py-0.5 bg-white/10 text-white/50">
              ⏱ {brief.estimatedTime}
            </span>
            <span className="font-mono text-[7.5px] tracking-wide px-2 py-0.5 bg-white/10 text-white/50">
              Role: {brief.roleTarget}
            </span>
            <span className="font-mono text-[7.5px] tracking-wide px-2 py-0.5 bg-[rgba(212,129,10,.3)] text-[#F5C469]">
              Priority: High
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-[18px_20px]">
          <div className="flex items-center gap-1.5 border border-[rgba(204,39,176,.15)] bg-[rgba(204,39,176,.04)] p-[10px_12px]">
            <div className="ai-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC27B0]" />
            <span className="text-[10.5px] text-[#CC27B0]">
              AI drafted this scenario based on a detected skill gap. Review and edit before submitting to the content team.
            </span>
          </div>

          <div>
            <div className="mb-1.5 font-mono text-[8px] uppercase tracking-widest text-[#A09D98]">Scenario context</div>
            <div className="border border-[#EEECE8] bg-[#FAFAF8] p-[12px_14px] text-[11.5px] leading-relaxed text-[#3D3C38]">
              {brief.context}
            </div>
          </div>

          <div>
            <div className="mb-1.5 font-mono text-[8px] uppercase tracking-widest text-[#A09D98]">Success criteria</div>
            <div className="flex flex-col gap-1">
              {brief.successCriteria.map((crit) => (
                <div
                  className="flex items-start gap-2 border border-[#EEECE8] bg-[#FAFAF8] p-[7px_10px] text-[11px] text-[#3D3C38]"
                  key={crit}
                >
                  <span className="mt-px shrink-0 font-bold text-[#0A6E45]">✓</span>
                  <span>{crit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="mb-1.5 font-mono text-[8px] uppercase tracking-widest text-[#A09D98]">Competencies</div>
              <div className="flex flex-wrap gap-1">
                {brief.competencies.map((comp) => (
                  <span
                    className="border border-[rgba(0,113,206,.12)] bg-[#F0F7FF] px-2 py-0.5 text-[9px] text-[#0071CE]"
                    key={comp}
                  >
                    {comp}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 font-mono text-[8px] uppercase tracking-widest text-[#A09D98]">Reviewer</div>
              <div className="text-[10px] text-[#3D3C38]">{brief.suggestedReviewer}</div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-[#E2DFD9] p-[14px_20px]">
          <button
            className="flex-1 cursor-pointer border border-[#D4D1CB] bg-[#F5F4F0] py-2 text-[10px] font-semibold text-[#3D3C38]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-1 cursor-pointer bg-[#CC27B0] py-2 text-[10px] font-semibold text-white"
            onClick={onSubmit}
            type="button"
          >
            Submit to content team →
          </button>
        </div>
      </div>
    </div>
  );
}
