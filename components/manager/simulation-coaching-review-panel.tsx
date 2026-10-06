"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { ManagerCopilotDraft } from "@/components/manager/manager-copilot-draft";
import { ScoreBar } from "@/components/ui/bars";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

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

function scoreTone(score: number): { label: string; pill: StatusTone; text: string } {
  if (score >= 80) return { label: "Strong", pill: "success", text: "text-blue" };
  if (score >= 70) return { label: "Developing", pill: "blue", text: "text-blue" };
  if (score >= 60) return { label: "Below target", pill: "warning", text: "text-warning" };
  return { label: "Below target", pill: "danger", text: "text-danger" };
}

const SECTION_TITLE = "label-caps mb-2 block";

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
    <div className="min-w-0 space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <span className={cn("num text-[44px] leading-none font-extrabold tracking-[-0.03em]", tone.text)}>
            {item.score}
            <span className="ml-1 text-[15px] font-semibold tracking-normal text-muted">of 100</span>
          </span>
          <StatusPill className="pb-1" tone={tone.pill}>
            {tone.label}
          </StatusPill>
        </div>
        <ScoreBar value={item.score} />
        {item.simulationLabel ? <p className="text-[13px] text-muted">{item.simulationLabel}</p> : null}
      </section>

      {item.managerSummary ? (
        <section>
          <h3 className={SECTION_TITLE}>What happened</h3>
          <p className="text-[15px] leading-normal text-ink-2">{item.managerSummary}</p>
        </section>
      ) : null}

      {item.recommendedImprovements.length > 0 ? (
        <section>
          <h3 className={SECTION_TITLE}>Coaching moments to relay</h3>
          <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
            {item.recommendedImprovements.slice(0, 4).map((moment) => (
              <li className="border-b border-divider last:border-b-0" key={moment}>
                <button
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left text-[15px] leading-normal text-ink-2 transition-colors hover:bg-blue-soft"
                  onClick={() => onAppendMoment(moment)}
                  type="button"
                >
                  <Plus aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                  <span>{moment}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-muted">Select a moment to add it to your feedback draft.</p>
        </section>
      ) : null}

      {item.seReflection ? (
        <section>
          <h3 className={SECTION_TITLE}>Their reflection</h3>
          <blockquote className="border-l-2 border-line-strong pl-4 text-[15px] leading-normal text-ink-2">
            {item.seReflection}
          </blockquote>
        </section>
      ) : null}

      <div className="space-y-5">
        <section>
          <h3 className={SECTION_TITLE}>Strengths</h3>
          <ul className="list-disc space-y-1 pl-5 text-[15px] leading-normal text-ink-2 marker:text-line-strong">
            {item.strengths.slice(0, 3).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className={SECTION_TITLE}>Gaps</h3>
          <ul className="list-disc space-y-1 pl-5 text-[15px] leading-normal text-ink-2 marker:text-line-strong">
            {item.gaps.slice(0, 3).map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
      </div>

      {item.transcript ? (
        <div>
          <button
            aria-expanded={showTranscript}
            className="link text-sm"
            onClick={() => setShowTranscript((open) => !open)}
            type="button"
          >
            {showTranscript ? "Hide full transcript" : "Show full transcript"}
          </button>
          {showTranscript ? (
            <pre className="mt-2 max-h-[min(420px,50vh)] overflow-y-auto whitespace-pre-wrap rounded-[14px] border border-line bg-bg p-4 text-sm leading-6 text-ink-2">
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
