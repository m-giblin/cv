"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
    color: "#0071CE",
    text: "Workforce IGA only. No NHI lifecycle, no agent governance. Weak on SoD controls.",
  },
  {
    label: "Microsoft Entra",
    color: "#5b21b6",
    text: "Good for workforce SSO. Agent governance is marketing, not product reality.",
  },
  {
    label: "Saviynt",
    color: "#D4810A",
    text: "IGA competitor. Weak deployment track record. SoD complexity is a known pain.",
  },
] as const;

function scoreColor(score: number) {
  if (score >= 85) return "#0A6E45";
  if (score >= 70) return "#0071CE";
  return "#D4810A";
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
    if (topic.toLowerCase().includes("okta")) return "SailPoint vs. Okta";
    if (topic.toLowerCase().includes("entra")) return "SailPoint vs. Entra";
    return `SailPoint vs. ${topic}`;
  }, [questions]);

  useEffect(() => {
    onProgressHintChange?.(
      questions.length
        ? `${weekLabel} · ${answeredCount} of ${questions.length} answered`
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
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#6B6860]">
        Loading this week&apos;s market pulse…
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#6B6860]">
        Market pulse unavailable — check Supabase connection.
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_300px]">
      {/* Left — quiz */}
      <div className="min-h-0 overflow-y-auto border-r border-[#E2DFD9] bg-white px-7 py-5">
        <div className="mb-5">
          <p className="mb-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#065F46]">
            {weekLabel} · {focusTitle}
          </p>
          <h1 className="font-display text-2xl font-extrabold leading-none tracking-[-0.03em] text-[#0D0E12]">
            Market Pulse
          </h1>
          <p className="mt-1 text-xs text-[#6B6860]">
            {questions.length} questions · ~4 min · Scores feed Competitive Positioning competency
          </p>
        </div>

        <div className="mb-6 flex gap-1">
          {questions.map((question, index) => {
            const answered = answers[question.id] !== undefined;
            const explained = submitted && explanationMap.has(question.id);
            const correct =
              explained && explanationMap.get(question.id)?.correctIndex === answers[question.id];
            const color = submitted
              ? correct || explained
                ? "#0A6E45"
                : answered
                  ? "#D4810A"
                  : "#ECEAE6"
              : answered
                ? "#0A6E45"
                : "#ECEAE6";
            return (
              <div
                className="h-[3px] flex-1 transition-colors"
                key={question.id}
                style={{ background: color }}
                title={`Question ${index + 1}`}
              />
            );
          })}
        </div>

        <div className="overflow-hidden border border-[#E2DFD9]">
          {questions.map((question, index) => {
            const num = String(index + 1).padStart(2, "0");
            const explain = explanationMap.get(question.id);
            const showResults = submitted && explain;

            return (
              <div
                className={cn(
                  "border-b border-[#ECEAE6] px-4 py-4 last:border-b-0",
                  index % 2 === 1 ? "bg-[#F9F8F6]" : "bg-white",
                )}
                key={question.id}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "w-[22px] shrink-0 font-mono text-base leading-none",
                      showResults ? "text-[#A09D98]" : "text-[#0D0E12]",
                    )}
                  >
                    {num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-2.5 text-[12.5px] font-semibold leading-snug text-[#0D0E12]">
                      {question.question}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {question.options.map((option, optionIndex) => {
                        const selected = answers[question.id] === optionIndex;
                        const isCorrect = explain?.correctIndex === optionIndex;
                        const showCorrect = showResults && isCorrect;
                        const showWrong = showResults && selected && !isCorrect;

                        return (
                          <button
                            className={cn(
                              "flex items-center gap-2 border-[1.5px] px-2.5 py-1.5 text-left text-[11.5px] transition",
                              showCorrect
                                ? "border-[#0A6E45] bg-[#EDFAF3] text-[#0A3D26]"
                                : showWrong
                                  ? "border-red-200 bg-red-50 text-[#0D0E12]"
                                  : selected
                                    ? "border-[#0071CE] bg-[#EEF4FF] text-[#0D0E12]"
                                    : "border-[#E2DFD9] bg-white text-[#0D0E12]",
                            )}
                            disabled={submitted}
                            key={option}
                            onClick={() =>
                              setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
                            }
                            type="button"
                          >
                            <span
                              className={cn(
                                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                                showCorrect
                                  ? "border-[#0A6E45] bg-[#0A6E45] text-white"
                                  : selected
                                    ? "border-[#0071CE] bg-[#0071CE]"
                                    : "border-[#D4D1CB] bg-white",
                              )}
                            >
                              {showCorrect ? <Check className="h-2 w-2" strokeWidth={2.5} /> : null}
                            </span>
                            <span className="flex-1">{option}</span>
                            {showCorrect ? (
                              <span className="ml-auto font-mono text-[8px] text-[#0A6E45]">✓ Correct</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    {showResults && explain?.explanation ? (
                      <div className="mt-2 border-l-[3px] border-[#0A6E45] bg-[#F0FDF7] px-2.5 py-2">
                        <p className="text-[11px] leading-relaxed text-[#0A3D26]">{explain.explanation}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!submitted ? (
          <div className="mt-3.5 flex justify-end">
            <button
              className="bg-[#065F46] px-5 py-2 text-[11px] font-semibold text-white hover:bg-[#054a38] disabled:opacity-50"
              disabled={answeredCount < questions.length}
              onClick={() => void handleSubmit()}
              type="button"
            >
              Submit quiz →
            </button>
          </div>
        ) : (
          <div className="mt-3.5 flex items-center justify-between">
            <p className="font-mono text-sm text-[#0A6E45]">
              Score {score}/{questions.length} (
              {Math.round((score / questions.length) * 100)}%)
            </p>
          </div>
        )}

        {submitted && reinforcements.length > 0 ? (
          <div className="mt-5 border border-[#E2DFD9] bg-[#F9F8F6] p-4">
            <p className="text-xs font-bold text-[#0D0E12]">Reinforce with practice</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {reinforcements.map((item) => (
                <div className="border border-[#E2DFD9] bg-white p-2.5" key={item.id}>
                  <p className="text-[11px] font-semibold text-[#0D0E12]">{item.title}</p>
                  <p className="mt-0.5 text-[10px] text-[#6B6860]">{item.reason}</p>
                  <Link
                    className="mt-1 inline-block text-[10px] font-semibold text-[#0071ce] hover:underline"
                    href={`/challenges?challenge=${item.id}`}
                  >
                    Open challenge →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Right — focus + reference + history */}
      <aside className="min-h-0 overflow-y-auto bg-[#F9F8F6]">
        <div className="relative overflow-hidden border-b border-[#E2DFD9] bg-[#00143A] px-4 py-3.5">
          <div className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-[#0A6E45]/30" />
          <div className="relative z-10">
            <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.14em] text-white/40">
              This week&apos;s focus
            </p>
            <p className="font-display text-sm font-extrabold tracking-[-0.01em] text-white">{focusTitle}</p>
            <p className="mt-1 text-[11px] text-white/50">Agent governance · NHI sprawl · Workforce IGA</p>
          </div>
        </div>

        <div className="border-b border-[#E2DFD9] px-4 py-3">
          <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#B0ADA8]">Quick reference</p>
          <div className="flex flex-col gap-1.5">
            {COMPETITOR_REF.map((item) => (
              <div
                className="border border-[#E2DFD9] border-l-2 bg-white px-2.5 py-2"
                key={item.label}
                style={{ borderLeftColor: item.color }}
              >
                <p
                  className="mb-0.5 font-mono text-[8px] uppercase tracking-[0.06em]"
                  style={{ color: item.color }}
                >
                  {item.label}
                </p>
                <p className="text-[11px] leading-relaxed text-[#3D3C38]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3">
          <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#B0ADA8]">Your history</p>
          {history.length === 0 && !submitted ? (
            <p className="text-[11px] text-[#A09D98]">Complete this week&apos;s pulse to log your score.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {(submitted
                ? [
                    {
                      topic: focusTitle,
                      date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                      score: Math.round((score / questions.length) * 100),
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
                  }))
              ).map((row) => (
                <div
                  className="flex items-center gap-2 border border-[#E2DFD9] bg-white px-2.5 py-1.5"
                  key={`${row.topic}-${row.date}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-[#0D0E12]">{row.topic}</p>
                    <p className="font-mono text-[8.5px] text-[#A09D98]">{row.date}</p>
                  </div>
                  <span
                    className="font-mono text-sm"
                    style={{ color: scoreColor(row.score) }}
                  >
                    {row.score}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
