"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useId } from "react";
import type { CoachingCardOutput } from "@/lib/ai/schemas";
import type { RubricCriterion } from "@/lib/simulations/session-rubric";
import { LABEL_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
import { Tag } from "@/components/ui/tag";
import type { SimulationAssignment } from "@/lib/types";

type TranscriptEntry = SimulationAssignment["transcript"][number];

/** v2 score rule: danger <60, warning 60–69, blue ≥70. Always shown next to the number. */
function scoreFillClass(score: number) {
  if (score < 60) return "bg-danger";
  if (score < 70) return "bg-warning";
  return "bg-blue";
}

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
  const reflectionId = useId();
  const runningScores = estimateScores(messages, criteria);
  const lastSe = [...messages].reverse().find((m) => m.speaker === "se");
  const coachHint = lastCoachInsight(messages);

  if (coachingCard) {
    const score = coachingCard.score;
    return (
      <aside className="flex min-h-0 flex-col overflow-y-auto border-t border-line bg-white lg:border-l lg:border-t-0">
        <div className="border-b border-divider p-4">
          <p className="label-mono">AI coaching report</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-[30px] font-extrabold leading-none tracking-[-0.03em] text-ink">{score}</p>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.03em] text-muted">Score / 100</p>
            </div>
            <Tag tone={showReflectionPrompt ? "signal" : "blue"}>
              {showReflectionPrompt ? "● Add reflection" : "◆ Review"}
            </Tag>
          </div>
          <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-[4px] bg-divider">
            <div
              className={`h-full rounded-[4px] ${scoreFillClass(score)}`}
              style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
            />
          </div>
        </div>

        <div className="flex-1 space-y-3 p-4">
          <div className="overflow-hidden rounded-[14px] border border-line">
            <div className="px-4 py-3">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-success">✓ Strength</p>
              <p className="mt-1 text-sm leading-[1.5] text-ink-2">{coachingCard.strengths[0]}</p>
            </div>
            <div className="border-t border-divider px-4 py-3">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-danger">▲ Improve</p>
              <p className="mt-1 text-sm leading-[1.5] text-ink-2">{coachingCard.gaps[0]}</p>
            </div>
            <div className="border-t border-divider px-4 py-3">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-blue">→ Next practice</p>
              <p className="mt-1 text-sm leading-[1.5] text-ink-2">{coachingCard.recommendedNextPractice}</p>
            </div>
          </div>
          <div className="rounded-[14px] bg-surface-2 p-3.5">
            <p className="label-mono">Manager summary</p>
            <p className="mt-1 text-sm leading-[1.5] text-ink-2">{coachingCard.managerSummary}</p>
          </div>

          {showReflectionPrompt ? (
            <div className="space-y-3 border-t border-divider pt-3">
              <label className={LABEL_CLS} htmlFor={reflectionId}>
                Your reflection
              </label>
              <textarea
                className={TEXTAREA_CLS}
                id={reflectionId}
                onChange={(e) => onReflectionChange(e.target.value)}
                placeholder="What will you do differently on your next call?"
                rows={3}
                value={seReflection}
              />
              {belowPracticeRecommendation ? (
                <p className="text-[13px] leading-[1.45] text-muted">
                  Manager recommends {practiceRoundsRecommended} practice round
                  {practiceRoundsRecommended === 1 ? "" : "s"} — submit now or practice {practiceRemaining} more.
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <button className="btn-primary justify-center" disabled={isGenerating} onClick={onSubmit} type="button">
                  Submit to manager
                </button>
                <button
                  className="btn-secondary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isGenerating}
                  onClick={onPracticeAgain}
                  type="button"
                >
                  {isGenerating ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  )}
                  Practice again
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-y-auto border-t border-line bg-white lg:border-l lg:border-t-0">
      <div className="border-b border-divider p-4">
        <p className="label-mono">Live coaching</p>
        <p className="mt-1 text-[13px] text-muted">Real-time feedback on your last move</p>
      </div>

      <div className="space-y-4 p-4">
        {lastSe ? (
          <div className="rounded-[14px] border border-line p-3.5">
            <p className="label-mono">Last move</p>
            <p className="mt-1 text-sm leading-[1.5] text-ink-2">{lastSe.message}</p>
            <p className="mt-2 font-mono text-xs font-medium uppercase tracking-[0.03em] text-success">
              ✓ +{Math.min(12, 4 + messages.length)} discovery pts
            </p>
          </div>
        ) : (
          <div className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-4 text-center text-sm text-muted">
            Send your first response to unlock live coaching hints.
          </div>
        )}

        <div className="rounded-[14px] bg-signal-soft p-3.5">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-ink">→ Next move</p>
          <p className="mt-1 text-sm leading-[1.5] text-ink">
            {coachHint ??
              "Probe the approval chain — who signs off on identity governance spend and what audit date is driving urgency?"}
          </p>
        </div>

        <div>
          <p className="label-mono mb-2">Running scores</p>
          <ul className="space-y-3">
            {runningScores.map((item) => (
              <li key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
                  <span className="font-medium text-ink-2">{item.label}</span>
                  <span className="font-mono text-xs font-medium text-ink">{item.score}</span>
                </div>
                <div aria-hidden="true" className="h-2 overflow-hidden rounded-[4px] bg-divider">
                  <div
                    className={`h-full rounded-[4px] ${scoreFillClass(item.score)}`}
                    style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
