"use client";

import { Loader2, RotateCcw } from "lucide-react";
import type { CoachingCardOutput } from "@/lib/ai/schemas";
import type { RubricCriterion } from "@/lib/simulations/session-rubric";
import { SP_BLUE_BTN, SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { SimulationAssignment } from "@/lib/types";

type TranscriptEntry = SimulationAssignment["transcript"][number];

function estimateScores(messages: TranscriptEntry[], criteria: RubricCriterion[]) {
  const seTurns = messages.filter((m) => m.speaker === "se").length;
  const coachTurns = messages.filter((m) => m.speaker === "coach").length;
  const base = Math.min(92, 52 + seTurns * 8 + coachTurns * 4);

  return criteria.map((criterion, index) => ({
    label: criterion.label,
    score: Math.min(95, base - index * 3 + (index === 0 ? coachTurns * 2 : 0)),
  }));
}

function lastCoachInsight(messages: TranscriptEntry[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const entry = messages[i];
    if (entry?.speaker === "coach") {
      return entry.message;
    }
  }
  return null;
}

export function SimulationCoachingRail({
  messages,
  criteria,
  coachingCard,
  showReflectionPrompt,
  seReflection,
  onReflectionChange,
  isGenerating,
  belowPracticeRecommendation,
  practiceRoundsRecommended,
  practiceRemaining,
  onPracticeAgain,
  onSubmit,
}: {
  messages: TranscriptEntry[];
  criteria: RubricCriterion[];
  coachingCard: CoachingCardOutput | null;
  showReflectionPrompt: boolean;
  seReflection: string;
  onReflectionChange: (value: string) => void;
  isGenerating: boolean;
  belowPracticeRecommendation: boolean;
  practiceRoundsRecommended: number;
  practiceRemaining: number;
  onPracticeAgain: () => void;
  onSubmit: () => void;
}) {
  const runningScores = estimateScores(messages, criteria);
  const lastSe = [...messages].reverse().find((m) => m.speaker === "se");
  const coachHint = lastCoachInsight(messages);

  if (coachingCard) {
    return (
      <aside className="flex min-h-0 flex-col overflow-y-auto border-t border-[#E2DFD9] bg-white lg:border-l lg:border-t-0">
        <div className="border-b border-[#ECEAE6] p-4">
          <p className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#CC27B0]">
            AI coaching report
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="font-display text-[36px] font-extrabold leading-none text-[#0D0E12]">{coachingCard.score}</p>
            <Badge tone={showReflectionPrompt ? "blue" : "amber"}>
              {showReflectionPrompt ? "Add reflection" : "Review"}
            </Badge>
          </div>
        </div>

        <div className="flex-1 space-y-3 p-4">
          <div className="border border-[#bbf7d0] bg-[#f0fdf4] p-3">
            <p className="font-mono text-[8px] font-medium uppercase tracking-[0.1em] text-[#15803d]">Strength</p>
            <p className="mt-1 text-[11.5px] leading-[1.55] text-[#374151]">{coachingCard.strengths[0]}</p>
          </div>
          <div className="border border-[#bfdbfe] bg-[#f0f7ff] p-3">
            <p className="font-mono text-[8px] font-medium uppercase tracking-[0.1em] text-[#1d4ed8]">Improve</p>
            <p className="mt-1 text-[11.5px] leading-[1.55] text-[#374151]">{coachingCard.gaps[0]}</p>
          </div>
          <div className="border border-[#fde68a] bg-[#fef9ec] p-3">
            <p className="font-mono text-[8px] font-medium uppercase tracking-[0.1em] text-[#b45309]">Next practice</p>
            <p className="mt-1 text-[11.5px] leading-[1.55] text-[#374151]">{coachingCard.recommendedNextPractice}</p>
          </div>
          <p className="border border-[#E2DFD9] bg-[#F9F8F6] p-3 text-[11.5px] leading-[1.6] text-[#374151]">
            {coachingCard.managerSummary}
          </p>

          {showReflectionPrompt ? (
            <div className="space-y-3 border-t border-[#ECEAE6] pt-3">
              <p className="text-[12px] font-semibold text-[#0D0E12]">Your reflection</p>
              <Textarea
                onChange={(e) => onReflectionChange(e.target.value)}
                placeholder="What will you do differently on your next call?"
                rows={3}
                value={seReflection}
              />
              {belowPracticeRecommendation ? (
                <p className="text-[11px] text-[#6B6860]">
                  Manager recommends {practiceRoundsRecommended} practice round
                  {practiceRoundsRecommended === 1 ? "" : "s"} — submit now or practice {practiceRemaining} more.
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <button className={SP_OUTLINE_BTN} disabled={isGenerating} onClick={onPracticeAgain} type="button">
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Practice again
                </button>
                <button className={SP_BLUE_BTN} disabled={isGenerating} onClick={onSubmit} type="button">
                  Submit to manager
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-y-auto border-t border-[#E2DFD9] bg-[#F9F8F6] lg:border-l lg:border-t-0">
      <div className="border-b border-[#ECEAE6] p-4">
        <p className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#0071CE]">Live coaching</p>
        <p className="mt-1 text-[11px] text-[#6B6860]">Real-time feedback on your last move</p>
      </div>

      <div className="space-y-3 p-4">
        {lastSe ? (
          <div className="border border-[#E2DFD9] bg-white p-3">
            <p className="font-mono text-[8px] font-medium uppercase tracking-[0.1em] text-[#A09D98]">Last move</p>
            <p className="mt-1 text-[11.5px] leading-[1.55] text-[#374151]">{lastSe.message}</p>
            <p className="mt-2 font-mono text-[9px] font-medium text-[#0A6E45]">+{Math.min(12, 4 + messages.length)} discovery pts</p>
          </div>
        ) : (
          <div className="border border-dashed border-[#D4D1CB] bg-white p-3 text-[11.5px] text-[#6B6860]">
            Send your first response to unlock live coaching hints.
          </div>
        )}

        <div className="border-l-[3px] border-[#0071CE] bg-[#F0F7FF] p-3">
          <p className="font-mono text-[8px] font-medium uppercase tracking-[0.1em] text-[#0071CE]">Next move</p>
          <p className="mt-1 text-[11.5px] leading-[1.55] text-[#1A3A5C]">
            {coachHint ??
              "Probe the approval chain — who signs off on identity governance spend and what audit date is driving urgency?"}
          </p>
        </div>

        <div>
          <p className="mb-2 font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#A09D98]">
            Running scores
          </p>
          <ul className="space-y-2">
            {runningScores.map((item) => (
              <li key={item.label}>
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="font-medium text-[#374151]">{item.label}</span>
                  <span className="font-mono text-[#6B6860]">{item.score}</span>
                </div>
                <div className="h-[3px] bg-[#ECEAE6]">
                  <div className="h-full bg-[#0071CE]" style={{ width: `${item.score}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
