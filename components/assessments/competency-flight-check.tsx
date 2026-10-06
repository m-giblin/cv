"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CARD_CLS, H2_CLS, LABEL_CLS, LINE_CARD_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
import { Stat } from "@/components/ui/stat";
import { ScoreBar } from "@/components/ui/bars";
import { Note } from "@/components/ui/editorial";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  competency: string;
  type: string;
  prompt: string;
  options?: string[];
  rubricHint: string;
};

const COMPETENCY_AREAS = [
  "Discovery",
  "Objection handling",
  "Demo execution",
  "Competitive positioning",
  "Value articulation",
];

/** Score colour rule: danger < 60, warning 60–69, blue ≥ 70. Always paired with the number. */
function scoreTextClass(score: number | null) {
  if (score === null) return "text-muted";
  if (score >= 70) return "text-blue";
  if (score >= 60) return "text-warning";
  return "text-danger";
}

function ScoreTag({ score }: { score: number }) {
  if (score >= 70) return <StatusPill tone="success">On track</StatusPill>;
  if (score >= 60) return <StatusPill tone="warning">Close</StatusPill>;
  return <StatusPill tone="danger">Needs practice</StatusPill>;
}

export function CompetencyFlightCheck({
  onProgressHintChange,
}: {
  onProgressHintChange?: (hint: string) => void;
}) {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [focus, setFocus] = useState<string[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(6);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [fieldSignalScore, setFieldSignalScore] = useState<number | null>(null);
  const [competencyScores, setCompetencyScores] = useState<Record<string, number> | null>(null);
  const [actions, setActions] = useState<Array<{ label: string; href: string; reason: string }>>([]);
  const [probeCounts, setProbeCounts] = useState<Record<string, number>>({});

  const lowestFocus = focus[0] ?? "Objection handling";
  const questionNumber = Math.min(progress + 1, total);

  useEffect(() => {
    if (!started) {
      onProgressHintChange?.("Adaptive assessment");
      return;
    }
    if (complete) {
      onProgressHintChange?.("Check complete");
      return;
    }
    onProgressHintChange?.(
      `Question ${questionNumber} of ${total}. Difficulty adapts to your gaps.`,
    );
  }, [complete, onProgressHintChange, questionNumber, started, total]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/assessments/flight-check");
    if (!response.ok) {
      setLoading(false);
      toast.error("Could not start flight check.");
      return;
    }
    const body = (await response.json()) as {
      sessionId: string;
      focusCompetencies: string[];
      question: Question | null;
      progress: number;
      total: number;
    };
    setSessionId(body.sessionId);
    setFocus(body.focusCompetencies);
    setQuestion(body.question);
    setProgress(body.progress);
    setTotal(body.total);
    setStarted(true);
    setLoading(false);
  }, []);

  async function submitAnswer(skip = false) {
    if (!question || !sessionId) return;
    setSubmitting(true);

    const payload =
      question.type === "talk_track"
        ? { sessionId, questionId: question.id, answer: skip ? "" : answer }
        : {
            sessionId,
            questionId: question.id,
            answer: skip ? 0 : (selected ?? 0),
          };

    const response = await fetch("/api/assessments/flight-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      toast.error("Could not save answer.");
      setSubmitting(false);
      return;
    }

    const body = (await response.json()) as {
      correct: boolean;
      rubricHint: string;
      progress: number;
      complete: boolean;
      fieldSignalScore: number | null;
      competencyScores: Record<string, number> | null;
      recommendedActions: Array<{ label: string; href: string; reason: string }> | null;
      question: Question | null;
    };

    setProbeCounts((current) => ({
      ...current,
      [question.competency]: (current[question.competency] ?? 0) + 1,
    }));

    if (body.competencyScores) {
      setCompetencyScores(body.competencyScores);
    }

    toast.message(body.correct ? "Signal strong" : "Gap detected", { description: body.rubricHint });

    if (body.complete) {
      setComplete(true);
      setFieldSignalScore(body.fieldSignalScore);
      setCompetencyScores(body.competencyScores);
      setActions(body.recommendedActions ?? []);
      setQuestion(null);
    } else {
      setQuestion(body.question);
      setProgress(body.progress);
      setAnswer("");
      setSelected(null);
    }

    setSubmitting(false);
  }

  const scoresPanel = (
    <section aria-labelledby="fc-scores" className="flex flex-col gap-2">
      <h2 className="label-caps" id="fc-scores">
        Scores so far
      </h2>
      <ul className={`${LINE_CARD_CLS} overflow-hidden`}>
        {COMPETENCY_AREAS.map((name) => {
          const score = competencyScores?.[name] ?? null;
          const probes = probeCounts[name] ?? 0;
          return (
            <li className="border-b border-divider px-4 py-3 last:border-b-0" key={name}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm text-ink-2">{name}</span>
                <span className={cn("num text-[13px] font-bold", scoreTextClass(score))}>
                  {score !== null ? score : probes > 0 ? "Probing" : "Not yet"}
                </span>
              </div>
              {score !== null ? <ScoreBar value={score} /> : null}
            </li>
          );
        })}
      </ul>
      {started ? (
        <p className="text-[13px] leading-[1.45] text-muted">
          Difficulty increases on strong answers. Next question targets{" "}
          <strong className="text-ink">{lowestFocus}</strong>, your lowest area.
        </p>
      ) : null}
    </section>
  );

  const sessionPanel = (
    <section aria-labelledby="fc-session" className="flex flex-col gap-3">
      <h2 className="label-caps" id="fc-session">
        This session
      </h2>
      <div className={`${LINE_CARD_CLS} grid grid-cols-2 gap-3 px-4 py-3`}>
        <Stat label="Done" value={progress} />
        <Stat label="Left" value={Math.max(0, total - progress)} />
      </div>
      {focus.length > 0 ? <h3 className="mt-1 text-[15px] font-bold text-ink">Focus areas</h3> : null}
      <ul className={cn(LINE_CARD_CLS, "overflow-hidden", focus.length === 0 && "hidden")}>
        {focus.map((item) => (
          <li className="border-b border-divider px-4 py-2.5 text-sm text-ink-2 last:border-b-0" key={item}>
            {item}
          </li>
        ))}
      </ul>
      <Note title="After this check">
        Practice matched to your weakest result is assigned for you. There is nothing to pick.
      </Note>
    </section>
  );

  const progressBlocks = started && !complete ? (
    <div className="flex items-center gap-3">
      <div aria-hidden="true" className="flex flex-1 gap-[3px]">
        {Array.from({ length: total }, (_, index) => (
          <span
            className={cn(
              "h-2 flex-1 rounded-[2px]",
              index < progress
                ? "bg-blue"
                : index === progress
                  ? "bg-signal"
                  : "bg-track",
            )}
            key={index}
          />
        ))}
      </div>
      <span className="shrink-0 text-[13px] text-muted">
        Question {questionNumber} of {total}
      </span>
    </div>
  ) : null;

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-4">
        {progressBlocks}

        {complete && fieldSignalScore !== null ? (
          <section aria-labelledby="fc-result" className="flex flex-col gap-4">
            <div aria-live="polite" className={`${CARD_CLS} px-6 py-5`} role="status">
              <h2 className="label-caps label-caps--blue" id="fc-result">
                Field signal score
              </h2>
              <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2">
                <p className="num text-[64px] font-extrabold leading-[0.85] tracking-[-0.04em] text-blue">
                  {fieldSignalScore}
                </p>
                <div className="pb-1">
                  <ScoreTag score={fieldSignalScore} />
                </div>
              </div>
              <p className="mt-3 text-[15px] text-ink-2">
                Adaptive probe complete. Practice has been auto-assigned based on your gaps.
              </p>
            </div>
            {actions.length > 0 ? (
              <ul className={`${LINE_CARD_CLS} overflow-hidden`}>
                {actions.map((action) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3.5 last:border-b-0"
                    key={action.href}
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-ink">{action.label}</p>
                      <p className="text-[13px] text-muted">{action.reason}</p>
                    </div>
                    <Link className="link text-sm" href={action.href}>
                      Go practice
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : !started ? (
          <section aria-labelledby="fc-start" className={`${CARD_CLS} px-6 py-6`}>
            <p className="label-caps label-caps--blue">Competency flight check</p>
            <h2 className={`${H2_CLS} mt-1`} id="fc-start">
              Ready to find your gaps?
            </h2>
            <p className="mt-2 max-w-[560px] text-[15px] leading-[1.5] text-ink-2">
              {total} adaptive probes across competency areas. Results auto-assign practice challenges and notify your
              manager.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                className="btn-primary inline-flex items-center gap-2"
                disabled={loading}
                onClick={() => void loadSession()}
                type="button"
              >
                {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Starting..." : "Start flight check"}
              </button>
              <button className="btn-secondary" disabled={loading} onClick={() => void loadSession()} type="button">
                Resume last session
              </button>
            </div>
          </section>
        ) : question ? (
          <section aria-labelledby="fc-question" className={`${CARD_CLS} flex flex-col gap-5 px-6 py-6`}>
            <div>
              <p className="text-[13px] font-semibold text-blue">
                {question.competency}, question {questionNumber}
              </p>
              <h2 className="mt-1.5 text-lg font-extrabold leading-[1.35] text-ink" id="fc-question">
                &ldquo;{question.prompt}&rdquo;
              </h2>
            </div>

            {question.type !== "talk_track" ? (
              <div aria-labelledby="fc-question" className="flex flex-col gap-2" role="group">
                {(question.options ?? []).map((option, index) => {
                  const active = selected === index;
                  return (
                    <button
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-[12px] px-4 py-3 text-left text-[15px] leading-[1.45] text-ink transition-colors",
                        active ? "border-[1.5px] border-blue bg-blue-soft" : "border border-line bg-white hover:bg-surface-2",
                      )}
                      key={option}
                      onClick={() => setSelected(index)}
                      type="button"
                    >
                      <span aria-hidden="true" className="mt-0.5 w-4 shrink-0 text-[13px] text-muted">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {active ? (
                        <StatusPill tone="blue">Selected</StatusPill>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS} htmlFor="fc-answer">
                {question.type === "talk_track" ? "Your response" : "Or write your own response"}
              </label>
              <textarea
                className={`${TEXTAREA_CLS} min-h-[96px]`}
                id="fc-answer"
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="I'd focus on the deployment methodology. We have a dedicated success framework…"
                rows={3}
                value={answer}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                className="btn-secondary"
                disabled={submitting}
                onClick={() => void submitAnswer(true)}
                type="button"
              >
                Skip
              </button>
              <button
                className="btn-primary inline-flex items-center gap-2"
                disabled={
                  submitting ||
                  (question.type === "talk_track"
                    ? answer.trim().length < 10
                    : selected === null && answer.trim().length < 10)
                }
                onClick={() => void submitAnswer()}
                type="button"
              >
                {submitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Saving..." : "Next question"}
              </button>
            </div>
          </section>
        ) : (
          <p
            className="rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted"
            role="status"
          >
            Loading next probe...
          </p>
        )}
      </div>

      <aside aria-label="Flight check progress" className="flex min-w-0 flex-col gap-6">
        {started || complete ? (
          scoresPanel
        ) : (
          <p className="rounded-[14px] border border-dashed border-line-strong p-5 text-center text-sm text-muted">
            Scores appear once you start.
          </p>
        )}
        {sessionPanel}
      </aside>
    </div>
  );
}
