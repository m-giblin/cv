"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { ManagerCopilotDraft } from "@/components/manager/manager-copilot-draft";

export type SimulationCoachingReviewData = {
  score: number;
  title: string;
  personName: string;
  strengths: string[];
  gaps: string[];
  recommendedImprovements: string[];
  managerSummary: string;
  seReflection?: string | null;
  simulationLabel?: string;
  transcript?: string;
};

function scoreTone(score: number) {
  if (score >= 80) return { label: "Strong", color: "#0A6E45", bg: "#EDFAF3" };
  if (score >= 70) return { label: "Developing", color: "#0071CE", bg: "#EEF4FF" };
  return { label: "Below target", color: "#B83128", bg: "#FEF0EE" };
}

export function SimulationCoachingReviewPanel({
  item,
  onDraft,
  onAppendMoment,
}: {
  item: SimulationCoachingReviewData;
  onDraft: (text: string) => void;
  onAppendMoment: (text: string) => void;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const tone = scoreTone(item.score);

  return (
    <div className="space-y-3 border-t border-[#ECEAE6] px-[18px] pb-3 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="font-mono text-[8px] uppercase tracking-[0.08em] px-2 py-0.5 font-bold"
          style={{ background: tone.bg, color: tone.color }}
        >
          {tone.label} · {item.score}/100
        </span>
        {item.simulationLabel ? (
          <span className="text-[10px] text-[#6B6860]">{item.simulationLabel}</span>
        ) : null}
      </div>

      {item.managerSummary ? (
        <div className="border-l-[3px] border-[#0071ce] bg-[#EEF4FF] px-3 py-2.5">
          <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#0071ce]">
            Session brief — what happened
          </p>
          <p className="text-[12px] leading-relaxed text-[#0D0E12]">{item.managerSummary}</p>
        </div>
      ) : null}

      {item.recommendedImprovements.length > 0 ? (
        <div>
          <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#6B6860]">
            Coaching moments to relay
          </p>
          <ul className="space-y-1.5">
            {item.recommendedImprovements.slice(0, 4).map((moment) => (
              <li key={moment}>
                <button
                  className="w-full border border-[#E2DFD9] bg-[#F9F8F6] px-3 py-2 text-left text-[11px] leading-relaxed text-[#3D3C38] transition hover:border-[#0071ce]/40 hover:bg-[#EEF4FF]"
                  onClick={() => onAppendMoment(moment)}
                  type="button"
                >
                  <span className="mr-1.5 font-semibold text-[#0071ce]">→</span>
                  {moment}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[9.5px] text-[#A09D98]">Click a moment to add it to your feedback draft.</p>
        </div>
      ) : null}

      {item.seReflection ? (
        <div className="border border-[#E2DFD9] bg-white px-3 py-2">
          <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">
            SE self-reflection
          </p>
          <p className="text-[11px] italic leading-relaxed text-[#3D3C38]">&ldquo;{item.seReflection}&rdquo;</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#6B6860]">Strengths</p>
          <ul className="mt-1 list-disc pl-4 text-[11px] text-[#3D3C38]">
            {item.strengths.slice(0, 3).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#6B6860]">Gaps</p>
          <ul className="mt-1 list-disc pl-4 text-[11px] text-[#3D3C38]">
            {item.gaps.slice(0, 3).map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      </div>

      {item.transcript ? (
        <div>
          <button
            className="flex items-center gap-1 text-[11px] font-semibold text-[#6B6860] hover:text-[#0071ce]"
            onClick={() => setShowTranscript((open) => !open)}
            type="button"
          >
            {showTranscript ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Full transcript (optional)
          </button>
          {showTranscript ? (
            <pre className="mt-2 max-h-[min(420px,50vh)] overflow-y-auto whitespace-pre-wrap border border-[#E2DFD9] bg-[#F9F8F6] p-3 text-[11px] leading-6 text-[#3D3C38]">
              {item.transcript}
            </pre>
          ) : null}
        </div>
      ) : null}

      <ManagerCopilotDraft
        autoDraft
        context={[
          item.simulationLabel ? `Scenario: ${item.simulationLabel}` : null,
          item.managerSummary ? `Session brief: ${item.managerSummary}` : null,
          item.seReflection ? `SE reflection: ${item.seReflection}` : null,
        ]
          .filter(Boolean)
          .join("\n")}
        gaps={item.gaps}
        managerSummary={item.managerSummary}
        onDraft={onDraft}
        recommendedImprovements={item.recommendedImprovements}
        strengths={item.strengths}
      />
    </div>
  );
}
