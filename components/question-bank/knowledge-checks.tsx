"use client";

import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import type { QuizQuestion } from "@/lib/question-bank/data";
import { SOURCE_LABEL, solutionOrder, type QuestionSourceKind } from "@/lib/question-bank/model";

export type Check = {
  key: string;
  kind: QuestionSourceKind;
  solution: string;
  chapter: number | null;
  playbookSlug: string | null;
  title: string; questions: number; lastScore: number | null; lastTakenAt: string | null };
type Result = {
  questionId: string;
  chosenIndex: number;
  correctIndex: number;
  correct: boolean;
  explanation: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Takes one quiz: questions in rotation, then the score with explanations. */
export function QuizPlayer({ check, onDone }: { check: Check; onDone: () => void }) {
  const [quiz, setQuiz] = useState<{ title: string; questions: QuizQuestion[] } | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [graded, setGraded] = useState<{ score: number; results: Result[]; completedSteps?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const start = useCallback(() => {
    setQuiz(null);
    setAnswers({});
    setGraded(null);
    setError("");
    void fetch(`/api/question-bank/quiz?source=${encodeURIComponent(check.key)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error ?? "This check couldn't load.");
        setQuiz(body);
      })
      .catch((caught: Error) => setError(caught.message));
  }, [check.key]);
  useEffect(() => start(), [start]);

  async function submit() {
    if (!quiz) return;
    const missing = quiz.questions.filter((question) => answers[question.id] === undefined).length;
    if (missing) return setError(`Answer every question first (${missing} left).`);
    setError("");
    setBusy(true);
    const response = await fetch("/api/question-bank/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: quiz.questions.map((question) => ({ questionId: question.id, chosenIndex: answers[question.id] })) }),
    });
    setBusy(false);
    if (!response.ok) return setError("Couldn't grade that. Try again.");
    setGraded(await response.json());
    onDone();
  }

  if (error && !quiz) return <p className="text-sm text-danger">{error}</p>;
  if (!quiz) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 aria-hidden className="animate-spin" size={16} /> Picking your questions
      </p>
    );
  }

  const resultFor = (id: string) => graded?.results.find((result) => result.questionId === id);
  return (
    <div className="flex flex-col gap-4">
      {graded ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-white px-4 py-3 shadow-[var(--shadow-card)]">
          <p className="text-ink">
            <span className={`num text-[24px] font-extrabold ${graded.score >= 80 ? "text-success" : graded.score >= 60 ? "text-warning" : "text-danger"}`}>
              {graded.score}%
            </span>{" "}
            {graded.results.filter((result) => result.correct).length} of {graded.results.length} right.
          </p>
          <button className="btn-secondary inline-flex items-center gap-2" onClick={start} type="button">
            <RefreshCw aria-hidden size={16} /> New questions
          </button>
        </div>
      ) : null}
      {graded?.completedSteps?.length ? (
        <p className="rounded-[12px] border border-success bg-success-soft px-4 py-3 text-sm text-ink" role="status">
          Passed. This completes your plan step{graded.completedSteps.length === 1 ? "" : "s"}: {graded.completedSteps.join(", ")}.
        </p>
      ) : null}

      <ol className="flex flex-col gap-4">
        {quiz.questions.map((question, number) => {
          const result = resultFor(question.id);
          return (
            <li className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-4 shadow-[var(--shadow-card)]" key={question.id}>
              <p className="font-bold text-ink">
                {number + 1}. {question.stem}
              </p>
              <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={`Question ${number + 1}`}>
                {question.choices.map((choice, position) => {
                  const chosen = answers[question.id] === choice.index;
                  const isRight = result && choice.index === result.correctIndex;
                  const isWrongPick = result && chosen && !result.correct;
                  return (
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-[10px] border px-3 py-2 text-sm ${
                        isRight
                          ? "border-success bg-success-soft font-bold"
                          : isWrongPick
                            ? "border-danger bg-danger-soft"
                            : chosen
                              ? "border-blue bg-blue-soft"
                              : "border-line hover:border-line-strong"
                      }`}
                      key={choice.index}
                    >
                      <input
                        checked={chosen}
                        className="mt-0.5"
                        disabled={Boolean(graded)}
                        name={question.id}
                        onChange={() => {
                          setAnswers((current) => ({ ...current, [question.id]: choice.index }));
                          setError("");
                        }}
                        type="radio"
                      />
                      <span>
                        {LETTERS[position]}. {choice.text}
                      </span>
                    </label>
                  );
                })}
              </div>
              {result ? (
                <div className="text-sm">
                  <p className={result.correct ? "font-bold text-success" : "font-bold text-danger"}>{result.correct ? "Right." : "Not quite."}</p>
                  <p className="text-ink">{result.explanation}</p>
                  {result.sourceUrl ? (
                    <a className="link mt-1 inline-flex items-center gap-1 text-[13px]" href={result.sourceUrl} rel="noreferrer" target="_blank">
                      {result.sourceTitle ?? "Read the source"} <ExternalLink aria-hidden size={12} />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {!graded ? (
        <div>
          <button className="btn-primary" disabled={busy} onClick={() => void submit()} type="button">
            {busy ? "Checking" : "Check my answers"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function KnowledgeChecks({ initialSource }: { initialSource?: string }) {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [active, setActive] = useState<string | null>(initialSource ?? null);

  const load = useCallback(() => {
    void fetch("/api/question-bank/quiz")
      .then((response) => (response.ok ? response.json() : { checks: [] }))
      .then((body: { checks?: Check[] }) => setChecks(body.checks ?? []))
      .catch(() => setChecks([]));
  }, []);
  useEffect(() => load(), [load]);

  if (!checks) return <p className="text-sm text-muted">Loading knowledge checks</p>;
  const current = checks.find((check) => check.key === active);

  if (current) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[22px] font-extrabold text-ink">{current.title}</h2>
          <button className="link text-sm" onClick={() => setActive(null)} type="button">
            All knowledge checks
          </button>
        </div>
        <QuizPlayer check={current} onDone={load} />
      </div>
    );
  }

  if (!checks.length) {
    return (
      <p className="rounded-[14px] border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        No knowledge checks are ready yet. Your admin adds them from the question bank.
      </p>
    );
  }

  // Playbook checks sit with their chapters; docs and developer topics are grouped by product.
  const playbookChecks = checks.filter((check) => check.kind === "playbook").sort((x, y) => (x.chapter ?? 99) - (y.chapter ?? 99));
  const productChecks = checks.filter((check) => check.kind !== "playbook");
  const groups = [...new Set(productChecks.map((check) => check.solution))].sort((x, y) => solutionOrder(x) - solutionOrder(y));

  const row = (check: Check) => (
    <li className="flex items-center gap-3 border-b border-divider px-4 py-3 last:border-b-0" key={check.key}>
      {check.chapter !== null ? (
        <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bg text-[13px] font-extrabold text-ink-2">{check.chapter}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-ink">{check.title.replace(/^Ch\. \d+ /, "")}</span>
        <span className="block text-[13px] text-muted">
          {check.kind === "playbook" ? (
            <>
              {check.questions} questions from this chapter, 5 per check ·{" "}
              {check.playbookSlug ? (
                <a className="link" href={`/learn/playbooks?playbook=${check.playbookSlug}`}>
                  Open the chapter
                </a>
              ) : null}
            </>
          ) : (
            `${SOURCE_LABEL[check.kind]} · ${check.questions} questions, 5 per check`
          )}
        </span>
      </span>
      {check.lastScore === null ? (
        <StatusPill tone="neutral">Not taken</StatusPill>
      ) : (
        <StatusPill tone={check.lastScore >= 80 ? "success" : "warning"}>Last {check.lastScore}%</StatusPill>
      )}
      <button className="btn-secondary shrink-0" onClick={() => setActive(check.key)} type="button">
        {check.lastScore === null ? "Start" : "Retake"}
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-8">
      {playbookChecks.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-[18px] font-extrabold text-ink">Playbook chapters</h2>
          <p className="m-0 text-sm text-muted">Check what stuck after reading a chapter. Each one is also on the chapter, under Practise this.</p>
          <ul className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]">{playbookChecks.map(row)}</ul>
        </section>
      ) : null}
      {groups.length ? (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-[18px] font-extrabold text-ink">Product knowledge</h2>
            <p className="m-0 text-sm text-muted">From SailPoint&apos;s documentation and developer portal, by product.</p>
          </div>
          {groups.map((solution) => (
            <div className="flex flex-col gap-2" key={solution}>
              <h3 className="label-caps">{solution}</h3>
              <ul className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]">
                {productChecks.filter((check) => check.solution === solution).map(row)}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
