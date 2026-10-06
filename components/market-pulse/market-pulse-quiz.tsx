"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CARD_CLS, H2_CLS, LINE_CARD_CLS } from "@/components/se/form-classes";
import { StatusPill } from "@/components/ui/status-pill";
import { loadMarketPulseHistory, saveMarketPulseResult } from "@/lib/market-pulse/history";
import { cn } from "@/lib/utils";

type PulseQuestion = {
  id: string;
  topic: string;
  question: string;
  options: string[];
};

type Explanation = { id: string; correctIndex: number; explanation: string };

type Reinforcement = { id: string; title: string; reason: string };

const COMPETITOR_REF = [
  {
    label: "Okta",
    text: "Workforce IGA only. No NHI lifecycle, no agent governance. Weak on SoD controls.",
  },
  {
    label: "Microsoft Entra",
    text: "Good for workforce SSO. Agent governance is marketing, not product reality.",
  },
  {
    label: "Saviynt",
    text: "IGA competitor. Weak deployment track record. SoD complexity is a known pain.",
  },
] as const;

const EMPTY_CLS =
  "rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted";

/** Score colour rule: danger < 60, warning 60–69, blue ≥ 70. Always paired with the number. */
function scoreTextClass(score: number) {
  if (score >= 70) return "text-blue";
  if (score >= 60) return "text-warning";
  return "text-danger";
}

function ScoreTag({ percent }: { percent: number }) {
  if (percent >= 70) return <StatusPill tone="success">On track</StatusPill>;
  if (percent >= 60) return <StatusPill tone="warning">Close</StatusPill>;
  return <StatusPill tone="danger">Needs practice</StatusPill>;
}

function formatWeekLabel(weekId: string) {
  if (!weekId) return "This week";
  const date = new Date(`${weekId}T12:00:00`);
  if (Number.isNaN(date.getTime())) return `Week ${weekId}`;
  return `Week of ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function MarketPulseQuiz({
  onProgressHintChange,
}: {
  onProgressHintChange?: (hint: string) => void;
}) {
  const [questions, setQuestions] = useState<PulseQuestion[]>([]);
  const [weekId, setWeekId] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [reinforcements, setReinforcements] = useState<Reinforcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState(loadMarketPulseHistory());

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/market-pulse");
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const body = (await response.json()) as {
        weekId: string;
        questions: PulseQuestion[];
        submitted: { score: number; total: number } | null;
      };
      setWeekId(body.weekId);
      setQuestions(body.questions);
      if (body.submitted) {
        setSubmitted(true);
        setScore(body.submitted.score);
      }
      setLoading(false);
    })();
  }, []);

  const answeredCount = Object.keys(answers).length;
  const weekLabel = formatWeekLabel(weekId);
  const focusTitle = useMemo(() => {
    const topic = questions[0]?.topic ?? "the field";
    if (topic.toLowerCase().includes("okta")) return "Versus Okta";
    if (topic.toLowerCase().includes("entra")) return "Versus Entra";
    return `Versus ${topic}`;
  }, [questions]);

  useEffect(() => {
    onProgressHintChange?.(
      questions.length
        ? `${weekLabel}. ${answeredCount} of ${questions.length} answered.`
        : weekLabel,
    );
  }, [answeredCount, onProgressHintChange, questions.length, weekLabel]);

  const explanationMap = new Map(explanations.map((item) => [item.id, item]));

  async function handleSubmit() {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Answer all questions first.");
      return;
    }

    const response = await fetch("/api/market-pulse/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId, answers }),
    });

    if (!response.ok) {
      toast.error("Could not save your pulse score.");
      return;
    }

    const body = (await response.json()) as {
      score: number;
      total: number;
      explanations: Explanation[];
      reinforcements?: Reinforcement[];
    };
    setScore(body.score);
    setExplanations(body.explanations);
    setReinforcements(body.reinforcements ?? []);
    setSubmitted(true);
    saveMarketPulseResult({ weekId, score: body.score, total: body.total });
    setHistory(loadMarketPulseHistory());
    toast.success(`Score: ${body.score}/${body.total}`);
  }

  if (loading) {
    return (
      <p className={EMPTY_CLS} role="status">
        Loading this week&apos;s market pulse...
      </p>
    );
  }

  if (questions.length === 0) {
    return <p className={EMPTY_CLS}>Market pulse is unavailable right now. Check the data connection and try again.</p>;
  }

  const percent = Math.round((score / questions.length) * 100);

  const historyRows = submitted
    ? [
        {
          topic: focusTitle,
          date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          score: percent,
        },
        ...history
          .filter((item) => item.weekId !== weekId)
          .map((item) => ({
            topic: `Week ${item.weekId}`,
            date: new Date(item.completedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            }),
            score: Math.round((item.score / item.total) * 100),
          })),
      ]
    : history.map((item) => ({
        topic: `Week ${item.weekId}`,
        date: new Date(item.completedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        score: Math.round((item.score / item.total) * 100),
      }));

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted">
            {weekLabel}. {focusTitle}, {questions.length} questions, about 4 min.
          </p>
          <p className="text-sm text-ink-2">Scores feed your competitive positioning competency.</p>
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="flex flex-1 gap-[3px]">
              {questions.map((question) => {
                const answered = answers[question.id] !== undefined;
                const explain = submitted ? explanationMap.get(question.id) : undefined;
                const tone = explain
                  ? explain.correctIndex === answers[question.id]
                    ? "bg-success"
                    : "bg-danger"
                  : answered
                    ? "bg-blue"
                    : "bg-track";
                return <span className={cn("h-2 flex-1 rounded-[2px]", tone)} key={question.id} />;
              })}
            </div>
            <span className="shrink-0 text-[13px] text-muted">
              {answeredCount} of {questions.length} answered
            </span>
          </div>
        </div>

        {submitted ? (
          <section aria-live="polite" className={`${LINE_CARD_CLS} flex flex-wrap items-end gap-x-6 gap-y-3 px-5 py-4`} role="status">
            <div>
              <p className="label-caps">Your score</p>
              <p className="text-[56px] font-extrabold leading-[0.85] tracking-[-0.04em] text-blue">
                {score}
                <span className="text-[28px] text-faint"> of {questions.length}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <ScoreTag percent={percent} />
              <span className="text-[13px] text-muted">{percent}% correct</span>
            </div>
          </section>
        ) : null}

        <ol className={`${CARD_CLS} overflow-hidden`}>
          {questions.map((question, index) => {
            const num = String(index + 1).padStart(2, "0");
            const explain = explanationMap.get(question.id);
            const showResults = submitted && explain;
            const headingId = `pulse-q-${question.id}`;

            return (
              <li className="border-b border-divider px-5 py-5 last:border-b-0" key={question.id}>
                <div className="flex items-start gap-4">
                  <span aria-hidden="true" className="w-7 shrink-0 text-[15px] font-medium text-muted">
                    {num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[13px] font-semibold text-blue">{question.topic}</p>
                    <p className="mb-3 text-base font-bold leading-[1.4] text-ink" id={headingId}>
                      <span className="sr-only">Question {index + 1}: </span>
                      {question.question}
                    </p>
                    <div aria-labelledby={headingId} className="flex flex-col gap-2" role="group">
                      {question.options.map((option, optionIndex) => {
                        const selected = answers[question.id] === optionIndex;
                        const isCorrect = explain?.correctIndex === optionIndex;
                        const showCorrect = Boolean(showResults && isCorrect);
                        const showWrong = Boolean(showResults && selected && !isCorrect);

                        return (
                          <button
                            aria-pressed={selected}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-[12px] px-4 py-3 text-left text-[15px] text-ink transition-colors disabled:cursor-default",
                              showCorrect
                                ? "border border-success bg-success-soft"
                                : showWrong
                                  ? "border border-danger bg-danger-soft"
                                  : selected
                                    ? "border-[1.5px] border-blue bg-blue-soft"
                                    : "border border-line bg-white enabled:hover:bg-surface-2",
                            )}
                            disabled={submitted}
                            key={option}
                            onClick={() =>
                              setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
                            }
                            type="button"
                          >
                            <span aria-hidden="true" className="w-4 shrink-0 text-[13px] text-muted">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span className="flex-1">{option}</span>
                            {showCorrect ? (
                              <StatusPill tone="success">Correct{selected ? "" : " answer"}</StatusPill>
                            ) : showWrong ? (
                              <StatusPill tone="danger">Your answer</StatusPill>
                            ) : selected ? (
                              <StatusPill tone="blue">Selected</StatusPill>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    {showResults && explain?.explanation ? (
                      <p className="mt-3 rounded-[10px] bg-surface-2 px-4 py-3 text-sm leading-[1.5] text-ink-2">
                        {explain.explanation}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {!submitted ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {answeredCount < questions.length ? (
              <span className="text-[13px] text-muted">Answer all {questions.length} questions to submit.</span>
            ) : null}
            <button
              className="btn-primary"
              disabled={answeredCount < questions.length}
              onClick={() => void handleSubmit()}
              type="button"
            >
              Submit quiz
            </button>
          </div>
        ) : null}

        {submitted && reinforcements.length > 0 ? (
          <section aria-labelledby="pulse-reinforce" className="flex flex-col gap-2">
            <h2 className={H2_CLS} id="pulse-reinforce">
              Reinforce with practice
            </h2>
            <ul className={`${LINE_CARD_CLS} overflow-hidden`}>
              {reinforcements.map((item) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3.5 last:border-b-0"
                  key={item.id}
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-ink">{item.title}</p>
                    <p className="text-[13px] text-muted">{item.reason}</p>
                  </div>
                  <Link className="link text-sm" href={`/practice/challenges?challenge=${item.id}`}>
                    Open challenge
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <aside aria-label="Market pulse reference" className="flex min-w-0 flex-col gap-5">
        <div className="rounded-[14px] border border-line bg-white px-5 py-4">
          <p className="label-caps label-caps--blue">This week&apos;s focus</p>
          <p className="mt-1 text-lg font-extrabold text-ink">{focusTitle}</p>
          <p className="mt-1 text-sm text-ink-2">Agent governance, NHI sprawl and workforce IGA.</p>
        </div>

        <section aria-labelledby="pulse-ref" className="flex flex-col gap-2">
          <h2 className="label-caps" id="pulse-ref">
            Quick reference
          </h2>
          <ul className={`${LINE_CARD_CLS} overflow-hidden`}>
            {COMPETITOR_REF.map((item) => (
              <li className="border-b border-divider px-4 py-3 last:border-b-0" key={item.label}>
                <p className="text-[13px] font-semibold text-blue">{item.label}</p>
                <p className="mt-0.5 text-sm leading-[1.5] text-ink-2">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="pulse-history" className="flex flex-col gap-2">
          <h2 className="label-caps" id="pulse-history">
            Your history
          </h2>
          {history.length === 0 && !submitted ? (
            <p className="rounded-[14px] border border-dashed border-line-strong p-5 text-center text-sm text-muted">
              Complete this week&apos;s pulse to log your score.
            </p>
          ) : (
            <ul className={`${LINE_CARD_CLS} overflow-hidden`}>
              {historyRows.map((row) => (
                <li
                  className="flex items-center gap-3 border-b border-divider px-4 py-3 last:border-b-0"
                  key={`${row.topic}-${row.date}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{row.topic}</p>
                    <p className="text-[13px] text-muted">{row.date}</p>
                  </div>
                  <span className={cn("num text-sm font-bold", scoreTextClass(row.score))}>
                    {row.score}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
