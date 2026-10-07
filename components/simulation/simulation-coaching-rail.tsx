"use client";

import { splitCoachMessage } from "@/lib/simulations/coach-message";
import { Loader2, RotateCcw } from "lucide-react";
import { useId } from "react";
import type { CoachingCardOutput } from "@/lib/ai/schemas";
import type { RubricCriterion } from "@/lib/simulations/session-rubric";
import { LABEL_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
import { StatusPill } from "@/components/ui/status-pill";
import type { SimulationAssignment } from "@/lib/types";

type TranscriptEntry = SimulationAssignment["transcript"][number];

/** v2 score rule: danger <60, warning 60–69, blue ≥70. Always shown next to the number. */
function scoreFillClass(score: number) {
  if (score < 60) return "bg-danger";
  if (score < 70) return "bg-warning";
  return "bg-blue";
}

function lastCoachInsight(messages: TranscriptEntry[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const entry = messages[i];
    if (entry?.speaker === "coach") {
      return splitCoachMessage(entry.message).reply;
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
  const lastSe = [...messages].reverse().find((m) => m.speaker === "se");
  const coachHint = lastCoachInsight(messages);
  // Scored notes from objection practice, newest first.
  const notes = messages
    .filter((m) => m.speaker === "coach")
    .map((m) => splitCoachMessage(m.message))
    .filter((parts) => parts.note)
    .reverse();
  const [latest, ...earlier] = notes;

  if (coachingCard) {
    const score = coachingCard.score;
    return (
      <aside className="flex min-h-0 flex-col overflow-y-auto border-t border-line bg-white lg:border-l lg:border-t-0">
        <div className="border-b border-divider p-4">
          <p className="label-caps">AI coaching report</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-[30px] font-extrabold leading-none tracking-[-0.03em] text-ink">{score}</p>
              <p className="mt-1 text-[13px] text-muted">out of 100</p>
            </div>
            <StatusPill tone={showReflectionPrompt ? "warning" : "blue"}>
              {showReflectionPrompt ? "Add a reflection" : "Ready to review"}
            </StatusPill>
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
              <p className="text-[13px] font-semibold text-success">Strength</p>
              <p className="mt-1 text-sm leading-[1.5] text-ink-2">{coachingCard.strengths[0]}</p>
            </div>
            <div className="border-t border-divider px-4 py-3">
              <p className="text-[13px] font-semibold text-danger">Improve</p>
              <p className="mt-1 text-sm leading-[1.5] text-ink-2">{coachingCard.gaps[0]}</p>
            </div>
            <div className="border-t border-divider px-4 py-3">
              <p className="text-[13px] font-semibold text-blue">Next practice</p>
              <p className="mt-1 text-sm leading-[1.5] text-ink-2">{coachingCard.recommendedNextPractice}</p>
            </div>
          </div>
          <div className="rounded-[14px] bg-surface-2 p-3.5">
            <p className="label-caps">Manager summary</p>
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
        <p className="label-caps">Live coaching</p>
        <p className="mt-1 text-[13px] text-muted">Real-time feedback on your last move</p>
      </div>

      <div className="space-y-4 p-4">
        {lastSe ? (
          <div className="rounded-[14px] border border-line p-3.5">
            <p className="label-caps">Last move</p>
            <p className="mt-1 text-sm leading-[1.5] text-ink-2">{lastSe.message}</p>
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-line-strong p-4 text-center text-sm text-muted">
            Send your first response to unlock live coaching hints.
          </div>
        )}

        {latest ? (
          <div className="rounded-[14px] bg-signal-soft p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-ink">Coach&apos;s note</p>
              {latest.score ? (
                <span
                  className={`num text-[20px] font-extrabold ${
                    latest.score.value / latest.score.outOf >= 0.7 ? "text-success" : latest.score.value / latest.score.outOf >= 0.5 ? "text-warning" : "text-danger"
                  }`}
                >
                  {latest.score.value}
                  <span className="text-[13px] font-bold text-muted">/{latest.score.outOf}</span>
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-[1.5] text-ink">{latest.note}</p>
          </div>
        ) : (
          <div className="rounded-[14px] bg-signal-soft p-3.5">
            <p className="text-[13px] font-semibold text-ink">Next move</p>
            <p className="mt-1 text-sm leading-[1.5] text-ink">
              {coachHint ??
                "Probe the approval chain — who signs off on identity governance spend and what audit date is driving urgency?"}
            </p>
          </div>
        )}

        {earlier.length ? (
          <details className="rounded-[14px] border border-line p-3.5">
            <summary className="cursor-pointer text-[13px] font-semibold text-ink">
              Earlier notes ({earlier.map((item) => (item.score ? `${item.score.value}` : "–")).join(", ")})
            </summary>
            <ol className="mt-2 flex flex-col gap-2">
              {earlier.map((item, index) => (
                <li className="text-[13px] leading-[1.45] text-ink-2" key={index}>
                  {item.score ? <span className="font-bold text-ink">{item.score.value}/{item.score.outOf}. </span> : null}
                  {item.note}
                </li>
              ))}
            </ol>
          </details>
        ) : null}

        <div>
          <h3 className="label-caps mb-2">What the card scores</h3>
          <ul className="flex flex-col divide-y divide-divider">
            {criteria.map((item) => (
              <li className="flex flex-col gap-0.5 py-2.5" key={item.label}>
                <span className="text-sm font-bold text-ink">{item.label}</span>
                <span className="text-[13px] leading-[1.45] text-muted">{item.description}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-muted">Scores appear on the coaching card when you end the roleplay.</p>
        </div>
      </div>
    </aside>
  );
}
