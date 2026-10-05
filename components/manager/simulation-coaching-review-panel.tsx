"use client";

import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useState } from "react";
import { ManagerCopilotDraft } from "@/components/manager/manager-copilot-draft";
import { Tag } from "@/components/ui/tag";

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
  if (score >= 80) return { label: "Strong", symbol: "✓", tag: "success" as const, text: "text-blue" };
  if (score >= 70) return { label: "Developing", symbol: "●", tag: "blue" as const, text: "text-blue" };
  if (score >= 60) return { label: "Below target", symbol: "▲", tag: "warning" as const, text: "text-warning" };
  return { label: "Below target", symbol: "▲", tag: "danger" as const, text: "text-danger" };
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
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-[32px] leading-none font-extrabold tracking-[-0.03em] ${tone.text}`}>
          {item.score}
          <span className="text-sm font-bold text-muted">/100</span>
        </span>
        <Tag tone={tone.tag}>
          {tone.symbol} {tone.label}
        </Tag>
        {item.simulationLabel ? (
          <span className="min-w-0 text-sm text-muted">{item.simulationLabel}</span>
        ) : null}
      </div>

      {item.managerSummary ? (
        <div className="rounded-[14px] bg-blue-soft px-4 py-3">
          <p className="label-mono mb-1">Session brief — what happened</p>
          <p className="text-sm leading-relaxed text-ink">{item.managerSummary}</p>
        </div>
      ) : null}

      {item.recommendedImprovements.length > 0 ? (
        <div>
          <p className="label-mono mb-2">Coaching moments to relay</p>
          <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
            {item.recommendedImprovements.slice(0, 4).map((moment) => (
              <li className="border-b border-divider last:border-b-0" key={moment}>
                <button
                  className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm leading-relaxed text-ink-2 transition-colors hover:bg-blue-soft"
                  onClick={() => onAppendMoment(moment)}
                  type="button"
                >
                  <Plus aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                  <span>{moment}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted">Select a moment to add it to your feedback draft.</p>
        </div>
      ) : null}

      {item.seReflection ? (
        <div className="rounded-[14px] border border-line bg-white px-4 py-3">
          <p className="label-mono mb-1">SE self-reflection</p>
          <p className="text-sm italic leading-relaxed text-ink-2">&ldquo;{item.seReflection}&rdquo;</p>
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <p className="label-mono">Strengths</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
            {item.strengths.slice(0, 3).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label-mono">Gaps</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
            {item.gaps.slice(0, 3).map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      </div>

      {item.transcript ? (
        <div>
          <button
            aria-expanded={showTranscript}
            className="link inline-flex items-center gap-1 text-sm"
            onClick={() => setShowTranscript((open) => !open)}
            type="button"
          >
            {showTranscript ? <ChevronUp aria-hidden className="h-4 w-4" /> : <ChevronDown aria-hidden className="h-4 w-4" />}
            Full transcript (optional)
          </button>
          {showTranscript ? (
            <pre className="mt-2 max-h-[min(420px,50vh)] overflow-y-auto whitespace-pre-wrap rounded-[14px] border border-line bg-bg p-3 font-mono text-xs leading-6 text-ink-2">
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
